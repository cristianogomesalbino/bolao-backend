import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { GROUP_ROLES_KEY } from './group-roles.decorator';
import { ErrorFactory } from '../../common/errors/error.factory';

@Injectable()
export class GroupRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      GROUP_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const grupoId = request.params.grupoId;

    if (!grupoId) {
      throw ErrorFactory.forbidden('Grupo não informado');
    }

    const grupoUsuario = await this.prisma.grupoUsuario.findUnique({
      where: {
        usuarioId_grupoId: {
          usuarioId: user.id,
          grupoId,
        },
      },
    });

    if (!grupoUsuario) {
      throw ErrorFactory.forbidden('Usuário não pertence a este grupo');
    }

    if (!requiredRoles.includes(grupoUsuario.role)) {
      throw ErrorFactory.forbidden('Sem permissão neste grupo');
    }

    return true;
  }
}

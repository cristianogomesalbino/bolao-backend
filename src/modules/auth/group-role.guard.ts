import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { GROUP_ROLES_KEY } from './group-roles.decorator';

@Injectable()
export class GroupRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      GROUP_ROLES_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;
    const grupoId = request.params.grupoId;

    if (!grupoId) {
      throw new ForbiddenException('Grupo não informado');
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
      throw new ForbiddenException(
        'Usuário não pertence a este grupo',
      );
    }

    if (!requiredRoles.includes(grupoUsuario.role)) {
      throw new ForbiddenException(
        'Sem permissão neste grupo',
      );
    }

    return true;
  }
}
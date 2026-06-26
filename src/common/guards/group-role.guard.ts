import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { GROUP_ROLES_KEY } from '../decorators/group-roles.decorator';
import { ErrorFactory } from '../errors/error.factory';
import { AUTH } from '../../modules/auth/auth.constants';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; perfil: string };
}

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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const grupoId = request.params.grupoId as string;

    if (!grupoId) {
      throw ErrorFactory.forbidden(AUTH.MENSAGENS.GRUPO_NAO_INFORMADO);
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
      throw ErrorFactory.forbidden(AUTH.MENSAGENS.USUARIO_NAO_PERTENCE_GRUPO);
    }

    if (!requiredRoles.includes(grupoUsuario.role)) {
      throw ErrorFactory.forbidden(AUTH.MENSAGENS.SEM_PERMISSAO_GRUPO);
    }

    return true;
  }
}

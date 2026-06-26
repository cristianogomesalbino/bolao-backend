import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ErrorFactory } from '../errors/error.factory';
import { AUTH } from '../../modules/auth/auth.constants';
import { PERFIL } from '../constants/roles.constants';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; perfil: string };
}

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const id = request.params.id;

    if (!user) {
      throw ErrorFactory.forbidden(AUTH.MENSAGENS.USUARIO_NAO_AUTENTICADO);
    }

    if (user.perfil === PERFIL.SUPER_ADMIN) {
      return true;
    }

    if (user.id === id) {
      return true;
    }

    throw ErrorFactory.forbidden(AUTH.MENSAGENS.SEM_PERMISSAO_RECURSO);
  }
}

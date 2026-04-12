import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { ErrorFactory } from '../../common/errors/error.factory';
import { AUTH } from './auth.constants';
import { PERFIL } from '../../common/constants/roles.constants';

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
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

import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { ErrorFactory } from '../../common/errors/error.factory';

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const id = request.params.id;

    if (!user) {
      throw ErrorFactory.forbidden('Usuário não autenticado');
    }

    if (user.perfil === 'SUPER_ADMIN') {
      return true;
    }

    if (user.id === id) {
      return true;
    }

    throw ErrorFactory.forbidden('Sem permissão para acessar este recurso');
  }
}

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ErrorFactory } from '../../common/errors/error.factory';
import { PERFIL } from '../../common/constants/roles.constants';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.perfil !== PERFIL.SUPER_ADMIN) {
      throw ErrorFactory.forbidden('Apenas SUPER_ADMIN pode executar esta ação');
    }

    return true;
  }
}

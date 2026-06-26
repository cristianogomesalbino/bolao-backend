import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ErrorFactory } from '../errors/error.factory';
import { PERFIL } from '../constants/roles.constants';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; perfil: string };
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || user.perfil !== PERFIL.SUPER_ADMIN) {
      throw ErrorFactory.forbidden(
        'Apenas SUPER_ADMIN pode executar esta ação',
      );
    }

    return true;
  }
}

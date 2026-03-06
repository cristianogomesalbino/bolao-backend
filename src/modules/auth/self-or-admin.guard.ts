import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    const id = request.params.id;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (user.perfil === 'SUPER_ADMIN') {
      return true;
    }

    if (user.id === id) {
      return true;
    }

    throw new ForbiddenException('Sem permissão para acessar este recurso');
  }
}

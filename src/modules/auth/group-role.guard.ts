import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GroupRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'groupRoles',
      context.getHandler(),
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const grupoId = request.params.grupoId;

    const grupoUsuario = await this.prisma.grupoUsuario.findUnique({
      where: {
        usuarioId_grupoId: {
          usuarioId: user.id,
          grupoId,
        },
      },
    });

    if (!grupoUsuario || !requiredRoles.includes(grupoUsuario.role)) {
      throw new ForbiddenException('Sem permissão no grupo');
    }

    return true;
  }
}
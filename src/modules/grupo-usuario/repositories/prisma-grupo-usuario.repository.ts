import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GrupoUsuarioRepository } from './grupo-usuario.repository.interface';

@Injectable()
export class PrismaGrupoUsuarioRepository implements GrupoUsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(
    data: { usuarioId: string; grupoId: string; role: string },
    include?: any,
  ) {
    return this.prisma.grupoUsuario.create({
      data: data as any,
      ...(include ? { include } : {}),
    });
  }

  buscarPorChave(usuarioId: string, grupoId: string) {
    return this.prisma.grupoUsuario.findUnique({
      where: { usuarioId_grupoId: { usuarioId, grupoId } },
    });
  }

  listarPorGrupo(grupoId: string) {
    return this.prisma.grupoUsuario.findMany({
      where: { grupoId },
      select: {
        role: true,
        usuario: {
          select: { id: true, nome: true },
        },
      },
    });
  }

  contarPorGrupo(grupoId: string) {
    return this.prisma.grupoUsuario.count({ where: { grupoId } });
  }

  contarAdminsPorGrupo(grupoId: string) {
    return this.prisma.grupoUsuario.count({
      where: { grupoId, role: 'ADMIN' },
    });
  }

  async remover(usuarioId: string, grupoId: string) {
    await this.prisma.grupoUsuario.delete({
      where: { usuarioId_grupoId: { usuarioId, grupoId } },
    });
  }
}

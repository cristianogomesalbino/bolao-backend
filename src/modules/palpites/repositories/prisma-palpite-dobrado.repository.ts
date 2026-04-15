import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PalpiteDobradoRepository } from './palpite-dobrado.repository.interface';

@Injectable()
export class PrismaPalpiteDobradoRepository implements PalpiteDobradoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: { usuarioId: string; jogoId: string; grupoId: string }) {
    return this.prisma.palpiteDobrado.create({ data });
  }

  async remover(usuarioId: string, jogoId: string, grupoId: string) {
    await this.prisma.palpiteDobrado.delete({
      where: { usuarioId_jogoId_grupoId: { usuarioId, jogoId, grupoId } },
    });
  }

  buscarPorChave(usuarioId: string, jogoId: string, grupoId: string) {
    return this.prisma.palpiteDobrado.findUnique({
      where: { usuarioId_jogoId_grupoId: { usuarioId, jogoId, grupoId } },
    });
  }

  listarPorJogoEGrupo(jogoId: string, grupoId: string) {
    return this.prisma.palpiteDobrado.findMany({
      where: { jogoId, grupoId },
    });
  }
}

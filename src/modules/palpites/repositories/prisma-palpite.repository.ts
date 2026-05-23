import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PalpiteRepository } from './palpite.repository.interface';

@Injectable()
export class PrismaPalpiteRepository implements PalpiteRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: { usuarioId: string; jogoId: string; golsCasa: number; golsFora: number }) {
    return this.prisma.palpite.create({ data });
  }

  atualizar(id: string, data: { golsCasa: number; golsFora: number }) {
    return this.prisma.palpite.update({ where: { id }, data });
  }

  async remover(id: string) {
    await this.prisma.palpite.delete({ where: { id } });
  }

  buscarPorId(id: string) {
    return this.prisma.palpite.findUnique({ where: { id } });
  }

  buscarPorUsuarioEJogo(usuarioId: string, jogoId: string) {
    return this.prisma.palpite.findUnique({
      where: { usuarioId_jogoId: { usuarioId, jogoId } },
    });
  }

  buscarPorUsuarioEJogos(usuarioId: string, jogoIds: string[]) {
    return this.prisma.palpite.findMany({
      where: { usuarioId, jogoId: { in: jogoIds } },
    });
  }

  listarPorUsuario(usuarioId: string, filtros?: { temporadaId?: string }) {
    return this.prisma.palpite.findMany({
      where: {
        usuarioId,
        ...(filtros?.temporadaId && {
          jogo: { fase: { temporadaId: filtros.temporadaId } },
        }),
      },
      include: { jogo: true },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  listarPorJogoEUsuarios(jogoId: string, usuarioIds: string[]) {
    return this.prisma.palpite.findMany({
      where: { jogoId, usuarioId: { in: usuarioIds } },
    });
  }

  listarPorFaseEUsuario(faseId: string, usuarioId: string) {
    return this.prisma.palpite.findMany({
      where: { usuarioId, jogo: { faseId } },
    });
  }

  listarPorJogosEUsuarios(jogoIds: string[], usuarioIds: string[]) {
    return this.prisma.palpite.findMany({
      where: { jogoId: { in: jogoIds }, usuarioId: { in: usuarioIds } },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JogoRepository } from './jogo.repository.interface';

@Injectable()
export class PrismaJogoRepository implements JogoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: any) {
    return this.prisma.jogo.create({ data });
  }

  atualizar(id: string, data: any) {
    return this.prisma.jogo.update({ where: { id }, data });
  }

  buscarPorId(id: string) {
    return this.prisma.jogo.findUnique({ where: { id }, include: { fase: true, timeCasa: true, timeFora: true } });
  }

  buscarPorIds(ids: string[]) {
    return this.prisma.jogo.findMany({ where: { id: { in: ids } } });
  }

  buscarPorExternoIds(externoIds: string[]) {
    return this.prisma.jogo.findMany({
      where: { externoId: { in: externoIds } },
      select: { externoId: true },
    });
  }

  buscarPorFase(faseId: string, rodada?: number) {
    const where: any = { faseId };
    if (rodada !== undefined) where.rodada = rodada;
    return this.prisma.jogo.findMany({
      where,
      include: { timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });
  }

  buscarPorExternoId(externoId: string) {
    return this.prisma.jogo.findUnique({ where: { externoId } });
  }

  buscarPorGrupoIdaVolta(grupoIdaVolta: string) {
    return this.prisma.jogo.findMany({ where: { grupoIdaVolta } });
  }

  async buscarRodadaAtual(faseId: string): Promise<number | null> {
    const jogo = await this.prisma.jogo.findFirst({
      where: { faseId, status: { not: 'FINALIZADO' }, rodada: { not: null } },
      orderBy: { rodada: 'asc' },
      select: { rodada: true },
    });
    if (jogo?.rodada) return jogo.rodada;

    // Todas finalizadas → retornar a última rodada
    const ultimo = await this.prisma.jogo.findFirst({
      where: { faseId, rodada: { not: null } },
      orderBy: { rodada: 'desc' },
      select: { rodada: true },
    });
    return ultimo?.rodada ?? null;
  }
}

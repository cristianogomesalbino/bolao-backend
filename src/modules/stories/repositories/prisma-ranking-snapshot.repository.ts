/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  RankingSnapshotRepository,
  RankingSnapshot,
  UpsertSnapshotData,
} from './ranking-snapshot.repository.interface';

@Injectable()
export class PrismaRankingSnapshotRepository implements RankingSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorGrupoFaseRodada(
    grupoId: string,
    faseId: string,
    rodada: number | null,
  ): Promise<RankingSnapshot[]> {
    const snapshots = await this.prisma.rankingSnapshot.findMany({
      where: { grupoId, faseId, rodada },
    });
    return snapshots as RankingSnapshot[];
  }

  async upsertBatch(dados: UpsertSnapshotData[]): Promise<void> {
    if (dados.length === 0) return;

    const promises = dados.map((item) =>
      this.prisma.rankingSnapshot.upsert({
        where: {
          grupoId_usuarioId_faseId_rodada: {
            grupoId: item.grupoId,
            usuarioId: item.usuarioId,
            faseId: item.faseId,
            rodada: item.rodada ?? 0,
          },
        },
        create: {
          grupoId: item.grupoId,
          usuarioId: item.usuarioId,
          faseId: item.faseId,
          rodada: item.rodada,
          posicao: item.posicao,
          pontuacao: item.pontuacao,
        },
        update: {
          posicao: item.posicao,
          pontuacao: item.pontuacao,
        },
      }),
    );

    await Promise.all(promises);
  }
}

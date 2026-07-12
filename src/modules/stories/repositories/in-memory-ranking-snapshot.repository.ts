import type {
  RankingSnapshotRepository,
  RankingSnapshot,
  UpsertSnapshotData,
} from './ranking-snapshot.repository.interface';
import { randomUUID } from 'node:crypto';

export class InMemoryRankingSnapshotRepository implements RankingSnapshotRepository {
  readonly snapshots: RankingSnapshot[] = [];

  buscarPorGrupoFaseRodada(
    grupoId: string,
    faseId: string,
    rodada: number | null,
  ): Promise<RankingSnapshot[]> {
    const resultado = this.snapshots.filter(
      (s) =>
        s.grupoId === grupoId && s.faseId === faseId && s.rodada === rodada,
    );
    return Promise.resolve(resultado);
  }

  upsertBatch(dados: UpsertSnapshotData[]): Promise<void> {
    for (const item of dados) {
      const existente = this.snapshots.find(
        (s) =>
          s.grupoId === item.grupoId &&
          s.usuarioId === item.usuarioId &&
          s.faseId === item.faseId &&
          s.rodada === item.rodada,
      );

      if (existente) {
        existente.posicao = item.posicao;
        existente.pontuacao = item.pontuacao;
      } else {
        this.snapshots.push({
          id: randomUUID(),
          ...item,
          criadoEm: new Date(),
        });
      }
    }
    return Promise.resolve();
  }
}

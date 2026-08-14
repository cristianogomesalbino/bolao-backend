// --- Tipos ---

export interface RankingSnapshot {
  id: string;
  grupoId: string;
  usuarioId: string;
  faseId: string;
  rodada: number | null;
  posicao: number;
  pontuacao: number;
  criadoEm: Date;
}

export interface UpsertSnapshotData {
  grupoId: string;
  usuarioId: string;
  faseId: string;
  rodada: number | null;
  posicao: number;
  pontuacao: number;
}

// --- Interface do Repository ---

export interface RankingSnapshotRepository {
  /**
   * Busca snapshots de um grupo para uma fase/rodada específica.
   * Retorna lista de posições dos membros na rodada anterior.
   */
  buscarPorGrupoFaseRodada(
    grupoId: string,
    faseId: string,
    rodada: number | null,
  ): Promise<RankingSnapshot[]>;

  /**
   * Cria ou atualiza snapshots em batch (upsert por unique constraint).
   * Usado após calcular ranking para persistir posições atuais.
   */
  upsertBatch(dados: UpsertSnapshotData[]): Promise<void>;
}

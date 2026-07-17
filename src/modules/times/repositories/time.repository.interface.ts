/**
 * Tipos e interface do repositório de Times.
 */

export interface Time {
  readonly id: string;
  readonly nome: string;
  readonly sigla: string;
  readonly escudo: string | null;
  readonly externoId: string | null;
  readonly dataCriacao: Date;
  readonly atualizadoEm: Date;
}

export interface CriarTimeData {
  readonly id?: string;
  readonly nome: string;
  readonly sigla: string;
  readonly escudo?: string | null;
  readonly externoId?: string | null;
}

export interface TimeRepository {
  criar(data: CriarTimeData): Promise<Time>;
  atualizar(
    id: string,
    data: Partial<{
      nome: string;
      sigla: string;
      escudo: string | null;
      externoId: string | null;
    }>,
  ): Promise<Time>;
  buscarPorExternoId(externoId: string): Promise<Time | null>;
  buscarPorId(id: string): Promise<Time | null>;
  buscarPorSigla(sigla: string): Promise<Time | null>;
  buscarTodos(): Promise<Time[]>;
  buscarPorExternoIds(externoIds: string[]): Promise<Time[]>;
}

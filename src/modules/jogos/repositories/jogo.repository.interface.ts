export interface JogoRepository {
  criar(data: any): Promise<any>;
  atualizar(id: string, data: any): Promise<any>;
  buscarPorId(id: string): Promise<any>;
  buscarPorIds(ids: string[]): Promise<any[]>;
  buscarPorExternoIds(externoIds: string[]): Promise<any[]>;
  buscarPorFase(faseId: string, rodada?: number): Promise<any[]>;
  buscarPorFaseAteRodada(faseId: string, ateRodada: number): Promise<any[]>;
  buscarPorFaseEStatus(faseId: string, status: string): Promise<any[]>;
  buscarPorExternoId(externoId: string): Promise<any>;
  buscarPorGrupoIdaVolta(grupoIdaVolta: string): Promise<any[]>;
  buscarProximoJogoPorTemporada(temporadaId: string): Promise<any>;
  contarAdiadosPorTemporada(temporadaId: string): Promise<number>;
  buscarTodosPorTemporada(temporadaId: string): Promise<any[]>;
  buscarRodadaAtual(faseId: string): Promise<number | null>;
}

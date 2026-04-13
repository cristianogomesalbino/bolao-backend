export interface TemporadaRepository {
  criar(data: { ano: number; campeonatoId: string }): Promise<any>;
  buscarTodos(): Promise<any[]>;
  buscarPorId(id: string): Promise<any>;
}

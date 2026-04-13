export interface CampeonatoRepository {
  criar(data: { nome: string }): Promise<any>;
  buscarTodos(): Promise<any[]>;
  buscarPorId(id: string): Promise<any>;
}

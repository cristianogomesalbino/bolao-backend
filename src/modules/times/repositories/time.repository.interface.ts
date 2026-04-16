export interface TimeRepository {
  criar(data: any): Promise<any>;
  buscarPorExternoId(externoId: string): Promise<any>;
  buscarPorId(id: string): Promise<any>;
  buscarPorSigla(sigla: string): Promise<any>;
  buscarTodos(): Promise<any[]>;
  buscarPorExternoIds(externoIds: string[]): Promise<any[]>;
}

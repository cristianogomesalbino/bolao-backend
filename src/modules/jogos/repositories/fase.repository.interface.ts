export interface FaseRepository {
  criar(data: any): Promise<any>;
  criarVarios(data: any[]): Promise<any[]>;
  buscarPorId(id: string): Promise<any>;
  buscarPorTemporada(temporadaId: string): Promise<any[]>;
}

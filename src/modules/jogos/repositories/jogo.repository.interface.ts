export interface JogoRepository {
  criar(data: any): Promise<any>;
  atualizar(id: string, data: any): Promise<any>;
  buscarPorId(id: string): Promise<any>;
  buscarPorFase(faseId: string): Promise<any[]>;
  buscarPorExternoId(externoId: string): Promise<any>;
  buscarPorGrupoIdaVolta(grupoIdaVolta: string): Promise<any[]>;
}

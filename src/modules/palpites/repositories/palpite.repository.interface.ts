export interface PalpiteRepository {
  criar(data: { usuarioId: string; jogoId: string; golsCasa: number; golsFora: number }): Promise<any>;
  atualizar(id: string, data: { golsCasa: number; golsFora: number }): Promise<any>;
  remover(id: string): Promise<void>;
  buscarPorId(id: string): Promise<any>;
  buscarPorUsuarioEJogo(usuarioId: string, jogoId: string): Promise<any>;
  buscarPorUsuarioEJogos(usuarioId: string, jogoIds: string[]): Promise<any[]>;
  listarPorUsuario(usuarioId: string, filtros?: { temporadaId?: string }): Promise<any[]>;
  listarPorJogoEUsuarios(jogoId: string, usuarioIds: string[]): Promise<any[]>;
  listarPorFaseEUsuario(faseId: string, usuarioId: string): Promise<any[]>;
  listarPorJogosEUsuarios(jogoIds: string[], usuarioIds: string[]): Promise<any[]>;
}

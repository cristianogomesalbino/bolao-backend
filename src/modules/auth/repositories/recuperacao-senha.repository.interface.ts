export interface RecuperacaoSenhaRepository {
  criar(data: {
    token: string;
    usuarioId: string;
    expiraEm: Date;
  }): Promise<any>;
  buscarPorToken(token: string): Promise<any>;
  invalidarPorUsuarioId(usuarioId: string): Promise<void>;
  marcarComoUsado(id: string): Promise<void>;
}

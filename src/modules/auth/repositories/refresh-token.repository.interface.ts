export interface RefreshTokenRepository {
  criar(data: {
    token: string;
    usuarioId: string;
    expiraEm: Date;
  }): Promise<any>;
  buscarPorToken(token: string): Promise<any>;
  removerPorUsuarioId(usuarioId: string): Promise<void>;
  removerPorToken(token: string): Promise<void>;
}

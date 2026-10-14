export interface NovoRefreshToken {
  token: string;
  usuarioId: string;
  expiraEm: Date;
}

export interface RefreshTokenRegistro {
  id: string;
  token: string;
  usuarioId: string;
  expiraEm: Date;
}

export interface ResultadoRotacao {
  status: 'rotacionado' | 'reusado';
  refreshToken: string;
}

export interface RefreshTokenRepository {
  criar(data: NovoRefreshToken): Promise<RefreshTokenRegistro>;
  buscarPorToken(token: string): Promise<RefreshTokenRegistro | null>;
  removerPorUsuarioId(usuarioId: string): Promise<void>;
  removerPorToken(token: string): Promise<void>;
  rotacionar(
    tokenAntigo: string,
    graciaMs: number,
    emitirNovo: () => NovoRefreshToken,
  ): Promise<ResultadoRotacao | null>;
}

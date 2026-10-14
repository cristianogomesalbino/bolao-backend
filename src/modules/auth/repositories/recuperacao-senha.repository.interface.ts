export interface RecuperacaoSenhaRegistro {
  id: string;
  usuarioId: string;
  expiraEm: Date;
  usado: boolean;
}

export interface RecuperacaoSenhaRepository {
  criar(data: {
    token: string;
    usuarioId: string;
    expiraEm: Date;
  }): Promise<RecuperacaoSenhaRegistro>;
  buscarPorToken(token: string): Promise<RecuperacaoSenhaRegistro | null>;
  invalidarPorUsuarioId(usuarioId: string): Promise<void>;
  marcarComoUsado(id: string): Promise<void>;
}

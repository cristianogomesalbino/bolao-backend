interface TokenDobroData {
  id: string;
  usuarioId: string;
  grupoId: string;
  motivo: string;
  referenciaId: string | null;
  tipo: string;
  dataCriacao: Date;
}

export class TokenDobroPresenter {
  static toHttp(token: TokenDobroData) {
    return {
      id: token.id,
      usuarioId: token.usuarioId,
      grupoId: token.grupoId,
      motivo: token.motivo,
      referenciaId: token.referenciaId,
      tipo: token.tipo,
      dataCriacao: token.dataCriacao,
    };
  }
}

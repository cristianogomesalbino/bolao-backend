export class TokenDobroPresenter {
  static toHttp(token: any) {
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

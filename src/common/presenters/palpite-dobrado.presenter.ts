export class PalpiteDobradoPresenter {
  static toHttp(palpiteDobrado: any) {
    return {
      id: palpiteDobrado.id,
      usuarioId: palpiteDobrado.usuarioId,
      jogoId: palpiteDobrado.jogoId,
      grupoId: palpiteDobrado.grupoId,
      dataCriacao: palpiteDobrado.dataCriacao,
    };
  }
}

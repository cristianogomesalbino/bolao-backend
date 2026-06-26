interface PalpiteDobradoData {
  id: string;
  usuarioId: string;
  jogoId: string;
  grupoId: string;
  dataCriacao: Date;
}

export class PalpiteDobradoPresenter {
  static toHttp(palpiteDobrado: PalpiteDobradoData) {
    return {
      id: palpiteDobrado.id,
      usuarioId: palpiteDobrado.usuarioId,
      jogoId: palpiteDobrado.jogoId,
      grupoId: palpiteDobrado.grupoId,
      dataCriacao: palpiteDobrado.dataCriacao,
    };
  }
}

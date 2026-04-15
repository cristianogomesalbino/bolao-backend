export class PalpitePresenter {
  static toHttp(palpite: any) {
    return {
      id: palpite.id,
      golsCasa: palpite.golsCasa,
      golsFora: palpite.golsFora,
      jogoId: palpite.jogoId,
      usuarioId: palpite.usuarioId,
      dataCriacao: palpite.dataCriacao,
    };
  }
}

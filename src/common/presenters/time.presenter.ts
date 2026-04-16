export class TimePresenter {
  static toHttp(time: any) {
    return {
      id: time.id,
      nome: time.nome,
      sigla: time.sigla,
      escudo: time.escudo,
      externoId: time.externoId,
    };
  }
}

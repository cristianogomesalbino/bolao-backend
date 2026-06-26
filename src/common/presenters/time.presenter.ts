interface TimeData {
  id: string;
  nome: string;
  sigla: string;
  escudo: string | null;
  externoId: string | null;
}

export class TimePresenter {
  static toHttp(time: TimeData) {
    return {
      id: time.id,
      nome: time.nome,
      sigla: time.sigla,
      escudo: time.escudo,
      externoId: time.externoId,
    };
  }
}

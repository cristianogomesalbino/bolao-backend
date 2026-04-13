import { CampeonatoPresenter } from './campeonato.presenter';

export class TemporadaPresenter {
  static toHttp(temporada: any) {
    return {
      id: temporada.id,
      ano: temporada.ano,
      campeonatoId: temporada.campeonatoId,
      dataCriacao: temporada.dataCriacao,
      ...(temporada.campeonato && {
        campeonato: CampeonatoPresenter.toHttp(temporada.campeonato),
      }),
    };
  }
}

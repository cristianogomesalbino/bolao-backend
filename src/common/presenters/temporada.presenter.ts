import { CampeonatoPresenter } from './campeonato.presenter';

export class TemporadaPresenter {
  static toHttp(temporada: any) {
    const nomeCampeonato = temporada.campeonato?.nome;
    return {
      id: temporada.id,
      nome: nomeCampeonato ? `${nomeCampeonato} ${temporada.ano}` : `Temporada ${temporada.ano}`,
      ano: temporada.ano,
      campeonatoId: temporada.campeonatoId,
      dataCriacao: temporada.dataCriacao,
      ...(temporada.campeonato && {
        campeonato: CampeonatoPresenter.toHttp(temporada.campeonato),
      }),
    };
  }
}

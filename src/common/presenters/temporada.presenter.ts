import { CampeonatoPresenter } from './campeonato.presenter';

interface TemporadaData {
  id: string;
  ano: number;
  campeonatoId: string;
  dataCriacao: Date;
  campeonato?: {
    id: string;
    nome: string;
    dataCriacao: Date;
    atualizadoEm: Date;
  } | null;
}

export class TemporadaPresenter {
  static toHttp(temporada: TemporadaData) {
    const nomeCampeonato = temporada.campeonato?.nome;
    return {
      id: temporada.id,
      nome: nomeCampeonato
        ? `${nomeCampeonato} ${temporada.ano}`
        : `Temporada ${temporada.ano}`,
      ano: temporada.ano,
      campeonatoId: temporada.campeonatoId,
      dataCriacao: temporada.dataCriacao,
      ...(temporada.campeonato && {
        campeonato: CampeonatoPresenter.toHttp(temporada.campeonato),
      }),
    };
  }
}

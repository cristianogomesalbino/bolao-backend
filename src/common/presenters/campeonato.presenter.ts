interface CampeonatoData {
  id: string;
  nome: string;
  dataCriacao: Date;
  atualizadoEm: Date;
}

export class CampeonatoPresenter {
  static toHttp(campeonato: CampeonatoData) {
    return {
      id: campeonato.id,
      nome: campeonato.nome,
      dataCriacao: campeonato.dataCriacao,
      atualizadoEm: campeonato.atualizadoEm,
    };
  }
}

export class CampeonatoPresenter {
  static toHttp(campeonato: any) {
    return {
      id: campeonato.id,
      nome: campeonato.nome,
      dataCriacao: campeonato.dataCriacao,
      atualizadoEm: campeonato.atualizadoEm,
    };
  }
}

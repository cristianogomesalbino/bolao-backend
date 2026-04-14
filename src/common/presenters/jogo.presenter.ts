export class JogoPresenter {
  static toHttp(jogo: any) {
    return {
      id: jogo.id,
      faseId: jogo.faseId,
      timeCasaId: jogo.timeCasaId,
      timeForaId: jogo.timeForaId,
      dataHora: jogo.dataHora,
      status: jogo.status,
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
      temProrrogacao: jogo.temProrrogacao,
      golsProrrogacaoCasa: jogo.golsProrrogacaoCasa,
      golsProrrogacaoFora: jogo.golsProrrogacaoFora,
      temPenaltis: jogo.temPenaltis,
      penaltisCasa: jogo.penaltisCasa,
      penaltisFora: jogo.penaltisFora,
      vencedorId: jogo.vencedorId,
      ehJogoVolta: jogo.ehJogoVolta,
      grupoIdaVolta: jogo.grupoIdaVolta,
      fonteResultado: jogo.fonteResultado,
      externoId: jogo.externoId,
      criadoPor: jogo.criadoPor,
      dataCriacao: jogo.dataCriacao,
      atualizadoEm: jogo.atualizadoEm,
    };
  }
}

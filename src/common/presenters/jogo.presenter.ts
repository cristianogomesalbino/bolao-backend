export class JogoPresenter {
  static toHttp(jogo: any, tipoFase?: string) {
    const base = {
      id: jogo.id,
      faseId: jogo.faseId,
      rodada: jogo.rodada,
      timeCasaId: jogo.timeCasaId,
      timeForaId: jogo.timeForaId,
      dataHora: jogo.dataHora,
      status: jogo.status,
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
      vencedorId: jogo.vencedorId,
      fonteResultado: jogo.fonteResultado,
      externoId: jogo.externoId,
      criadoPor: jogo.criadoPor,
      dataCriacao: jogo.dataCriacao,
      atualizadoEm: jogo.atualizadoEm,
    };

    if (tipoFase === 'PONTOS_CORRIDOS') {
      return base;
    }

    return {
      ...base,
      temProrrogacao: jogo.temProrrogacao,
      golsProrrogacaoCasa: jogo.golsProrrogacaoCasa,
      golsProrrogacaoFora: jogo.golsProrrogacaoFora,
      temPenaltis: jogo.temPenaltis,
      penaltisCasa: jogo.penaltisCasa,
      penaltisFora: jogo.penaltisFora,
      ehJogoVolta: jogo.ehJogoVolta,
      grupoIdaVolta: jogo.grupoIdaVolta,
    };
  }
}

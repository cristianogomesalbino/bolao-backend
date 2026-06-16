export class JogoPresenter {
  static toHttpResumido(jogo: any) {
    return {
      id: jogo.id,
      faseId: jogo.faseId,
      rodada: jogo.rodada,
      status: jogo.status,
      dataHora: jogo.dataHora,
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
      foiAdiado: jogo.foiAdiado,
      timeCasa: jogo.timeCasa ? { id: jogo.timeCasa.id, nome: jogo.timeCasa.nome, sigla: jogo.timeCasa.sigla, escudo: jogo.timeCasa.escudo } : null,
      timeFora: jogo.timeFora ? { id: jogo.timeFora.id, nome: jogo.timeFora.nome, sigla: jogo.timeFora.sigla, escudo: jogo.timeFora.escudo } : null,
    };
  }

  static toHttp(jogo: any, tipoFase?: string) {
    const base = {
      id: jogo.id,
      faseId: jogo.faseId,
      rodada: jogo.rodada,
      timeCasaId: jogo.timeCasaId,
      timeForaId: jogo.timeForaId,
      ...(jogo.timeCasa && {
        timeCasa: { id: jogo.timeCasa.id, nome: jogo.timeCasa.nome, sigla: jogo.timeCasa.sigla, escudo: jogo.timeCasa.escudo },
      }),
      ...(jogo.timeFora && {
        timeFora: { id: jogo.timeFora.id, nome: jogo.timeFora.nome, sigla: jogo.timeFora.sigla, escudo: jogo.timeFora.escudo },
      }),
      dataHora: jogo.dataHora,
      status: jogo.status,
      foiAdiado: jogo.foiAdiado,
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
      vencedorId: jogo.vencedorId,
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

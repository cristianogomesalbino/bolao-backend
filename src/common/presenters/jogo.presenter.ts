interface TimeRelacao {
  id: string;
  nome: string;
  sigla: string;
  escudo: string | null;
}

interface JogoData {
  id: string;
  faseId: string;
  rodada: number;
  timeCasaId: string;
  timeForaId: string;
  timeCasa?: TimeRelacao | null;
  timeFora?: TimeRelacao | null;
  dataHora: Date | null;
  status: string;
  foiAdiado: boolean;
  golsCasa: number | null;
  golsFora: number | null;
  vencedorId: string | null;
  dataCriacao: Date;
  atualizadoEm: Date;
  temProrrogacao?: boolean;
  golsProrrogacaoCasa?: number | null;
  golsProrrogacaoFora?: number | null;
  temPenaltis?: boolean;
  penaltisCasa?: number | null;
  penaltisFora?: number | null;
  ehJogoVolta?: boolean;
  grupoIdaVolta?: string | null;
  fonteResultado?: string | null;
  externoId?: string | null;
}

export class JogoPresenter {
  static toHttpResumido(jogo: JogoData) {
    return {
      id: jogo.id,
      faseId: jogo.faseId,
      rodada: jogo.rodada,
      status: jogo.status,
      dataHora: jogo.dataHora,
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
      foiAdiado: jogo.foiAdiado,
      timeCasa: jogo.timeCasa
        ? {
            id: jogo.timeCasa.id,
            nome: jogo.timeCasa.nome,
            sigla: jogo.timeCasa.sigla,
            escudo: jogo.timeCasa.escudo,
          }
        : null,
      timeFora: jogo.timeFora
        ? {
            id: jogo.timeFora.id,
            nome: jogo.timeFora.nome,
            sigla: jogo.timeFora.sigla,
            escudo: jogo.timeFora.escudo,
          }
        : null,
    };
  }

  static toHttp(jogo: JogoData, tipoFase?: string) {
    const base = {
      id: jogo.id,
      faseId: jogo.faseId,
      rodada: jogo.rodada,
      timeCasaId: jogo.timeCasaId,
      timeForaId: jogo.timeForaId,
      ...(jogo.timeCasa && {
        timeCasa: {
          id: jogo.timeCasa.id,
          nome: jogo.timeCasa.nome,
          sigla: jogo.timeCasa.sigla,
          escudo: jogo.timeCasa.escudo,
        },
      }),
      ...(jogo.timeFora && {
        timeFora: {
          id: jogo.timeFora.id,
          nome: jogo.timeFora.nome,
          sigla: jogo.timeFora.sigla,
          escudo: jogo.timeFora.escudo,
        },
      }),
      dataHora: jogo.dataHora,
      status: jogo.status,
      foiAdiado: jogo.foiAdiado,
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
      vencedorId: jogo.vencedorId,
      fonteResultado: jogo.fonteResultado ?? null,
      externoId: jogo.externoId ?? null,
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

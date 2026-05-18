// ============================================================
// FACTORY — Jogo
// ============================================================

export interface JogoData {
  timeCasaId: string;
  timeForaId: string;
  dataHora: string;
  grupoIdaVolta?: string;
  ehJogoVolta?: boolean;
}

export interface FinalizarJogoData {
  golsCasa: number;
  golsFora: number;
  temProrrogacao?: boolean;
  temPenaltis?: boolean;
}

export function factoryJogo(target: string): JogoData {
  const jogos: Record<string, JogoData> = {
    for_post_jogo: {
      timeCasaId: 'flamengo',
      timeForaId: 'palmeiras',
      dataHora: new Date(Date.now() + 86400000).toISOString(), // amanhã
    },
    for_post_jogo_volta: {
      timeCasaId: 'palmeiras',
      timeForaId: 'flamengo',
      dataHora: new Date(Date.now() + 172800000).toISOString(), // depois de amanhã
      grupoIdaVolta: 'quartas-1',
      ehJogoVolta: true,
    },
    jogo_to_manage_suite: {
      timeCasaId: 'flamengo',
      timeForaId: 'vasco',
      dataHora: new Date(Date.now() + 86400000).toISOString(),
    },
  };

  return jogos[target];
}

export function factoryFinalizarJogo(target: string): FinalizarJogoData {
  const finalizacoes: Record<string, FinalizarJogoData> = {
    vitoria_casa: {
      golsCasa: 2,
      golsFora: 1,
    },
    empate: {
      golsCasa: 1,
      golsFora: 1,
    },
    com_penaltis: {
      golsCasa: 1,
      golsFora: 1,
      temProrrogacao: true,
      temPenaltis: true,
    },
  };

  return finalizacoes[target];
}

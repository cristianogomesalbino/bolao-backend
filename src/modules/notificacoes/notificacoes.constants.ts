export const NOTIFICACOES = {
  TAG: 'Notificações',
  NOTIFICACAO_REPOSITORY_TOKEN: 'NOTIFICACAO_REPOSITORY',
  INSCRICAO_PUSH_REPOSITORY_TOKEN: 'INSCRICAO_PUSH_REPOSITORY',
  PREFERENCIA_REPOSITORY_TOKEN: 'PREFERENCIA_REPOSITORY',
  EVENT_SERVICE_TOKEN: 'NOTIFICACAO_EVENT_SERVICE',

  LIMITES: {
    TITULO_MAX: 100,
    MENSAGEM_MAX: 500,
    PUSH_TITULO_MAX: 50,
    PUSH_MENSAGEM_MAX: 150,
    INSCRICOES_POR_USUARIO: 10,
    LISTAGEM_LIMIT_DEFAULT: 20,
    LISTAGEM_LIMIT_MAX: 50,
    BATCH_LIMPEZA: 1000,
    BATCH_MARCAR_LIDAS: 1000,
  },

  CRON: {
    JOGO_PROXIMO_MINUTOS: 10,
    PALPITES_PENDENTES_HORAS: 3,
    LIMPEZA_LIDAS_DIAS: 30,
    LIMPEZA_NAO_LIDAS_DIAS: 90,
  },

  MENSAGENS: {
    NOTIFICACAO_NAO_ENCONTRADA: 'Notificação não encontrada',
    LIMITE_INSCRICOES_ATINGIDO:
      'Limite de inscrições push atingido (máximo 10)',
    INSCRICAO_NAO_ENCONTRADA: 'Inscrição push não encontrada',
    TIPO_INVALIDO: 'Tipo de notificação inválido',
    TODAS_MARCADAS_LIDAS: 'Todas as notificações foram marcadas como lidas',
    NOTIFICACAO_MARCADA_LIDA: 'Notificação marcada como lida',
    INSCRICAO_CRIADA: 'Inscrição push registrada com sucesso',
    INSCRICAO_REMOVIDA: 'Inscrição push removida com sucesso',
    PREFERENCIAS_ATUALIZADAS: 'Preferências atualizadas com sucesso',
  },

  TEMPLATES: {
    JOGO_PROXIMO: {
      titulo: 'Jogo em 10 minutos!',
      mensagem: (timeCasa: string, timeFora: string) =>
        `Jogo ${timeCasa} × ${timeFora} começa em 10 minutos!`,
    },
    RODADA_ENCERRADA: {
      titulo: 'Rodada encerrada!',
      mensagem: (rodada: number, faseNome: string) => {
        const ehFaseUnica = faseNome.toLowerCase().includes('fase única') || faseNome.toLowerCase().includes('pontos corridos');
        return ehFaseUnica
          ? `Rodada ${rodada} encerrada! Confira o ranking.`
          : `Rodada ${rodada} (${faseNome}) encerrada! Confira o ranking.`;
      },
    },
    ACERTO_EM_CHEIO: {
      titulo: 'Acerto em cheio!',
      mensagem: (
        timeCasa: string,
        golsCasa: number,
        golsFora: number,
        timeFora: string,
        pontos: number,
      ) =>
        `Você acertou em cheio! ${timeCasa} ${golsCasa} × ${golsFora} ${timeFora} (+${pontos} pts)`,
    },
    SUBIU_POSICAO: {
      titulo: 'Subiu no ranking!',
      mensagem: (posicao: number, grupoNome: string) =>
        `Você subiu para ${posicao}º lugar no grupo ${grupoNome}!`,
    },
    DESCEU_POSICAO: {
      titulo: 'Desceu no ranking',
      mensagem: (posicao: number, grupoNome: string) =>
        `Você caiu para ${posicao}º lugar no grupo ${grupoNome}.`,
    },
    PALPITES_PENDENTES: {
      titulo: 'Palpites pendentes!',
      mensagem: (quantidade: number, rodada: number) =>
        `Faltam ${quantidade} palpites para a rodada ${rodada}! Não esqueça.`,
    },
  },
} as const;

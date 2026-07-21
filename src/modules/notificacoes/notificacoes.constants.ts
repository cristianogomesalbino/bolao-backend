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
    // Horários dos jobs (em UTC — BRT = UTC-3)
    AGENDAMENTO_DIARIO: '0 11 * * *', // 08:00 BRT
    FALLBACK_JOGOS: '*/15 11-23,0-4 * * *', // a cada 15min entre 08h-01h BRT
    PALPITES_PENDENTES: '0,30 11-23,0-4 * * *', // a cada 30min entre 08h-01h BRT
    LIMPEZA_DIARIA: '0 5 * * *', // 02:00 BRT
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
        `Não durma no ponto! Jogo ${timeCasa} × ${timeFora} começa em 10 minutos!`,
    },
    RODADA_ENCERRADA: {
      titulo: 'Rodada encerrada!',
      mensagem: (rodada: number, campeonatoNome: string) =>
        `Rodada ${rodada} do ${campeonatoNome} encerrada! Confira o ranking.`,
    },
    ACERTO_EM_CHEIO: {
      titulo: 'Na mosca!',
      mensagem: (
        timeCasa: string,
        golsCasa: number,
        golsFora: number,
        timeFora: string,
        pontos: number,
      ) =>
        `Você acertou em cheio! ${timeCasa} ${golsCasa} × ${golsFora} ${timeFora} (+${pontos} pontos)`,
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
      mensagemMataMata: (jogos: string[]) =>
        jogos.length === 1
          ? `Falta palpite para ${jogos[0]}! Não esqueça.`
          : `Faltam palpites para ${jogos.join(', ')}! Não esqueça.`,
    },
    JOGO_LIBERADO: {
      titulo: 'Jogo liberado!',
      mensagem: (timeCasa: string, timeFora: string) =>
        `O jogo ${timeCasa} × ${timeFora} está definido. Dê seu palpite!`,
    },
    VENCEDOR_BOLAO: {
      titulo: 'Temos um campeão!',
      mensagemVencedor: (grupoNome: string, pontos: number) =>
        `Parabéns! Você é o campeão do bolão "${grupoNome}" com ${pontos} pontos!`,
      mensagemMembros: (
        vencedorNome: string,
        grupoNome: string,
        pontos: number,
      ) =>
        `${vencedorNome} venceu o bolão "${grupoNome}" com ${pontos} pontos! Confira o ranking final.`,
    },
  },
} as const;

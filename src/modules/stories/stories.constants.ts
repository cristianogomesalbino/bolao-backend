export const STORIES = {
  TAG: 'Stories',
  STORY_REPOSITORY_TOKEN: 'STORY_REPOSITORY',
  RECORDE_REPOSITORY_TOKEN: 'RECORDE_REPOSITORY',
  RANKING_SNAPSHOT_REPOSITORY_TOKEN: 'RANKING_SNAPSHOT_REPOSITORY',
  EVENT_SERVICE_TOKEN: 'STORY_EVENT_SERVICE',

  LIMITES: {
    EXPIRACAO_DIAS: 30,
    SEQUENCIA_MOSCA_MINIMA: 2,
    SEQUENCIA_RESULTADO_CONSULTA_RODADAS: 3,
    ULTIMOS_JOGOS_SEQUENCIA: 5,
    MAX_STORIES_LISTAGEM: 20,
    MIN_STORIES_VIEWER: 5,
    SUBIU_RANKING_MINIMO: 2,
    SUBIU_RANKING_TOP: 5,
  },

  TIMER_POR_TIPO: {
    ACERTOU_EM_CHEIO: 5,
    UNICO_NA_MOSCA: 6,
    SUBIU_RANKING: 8,
    SEQUENCIA_MOSCA: 7,
    SEQUENCIA_RESULTADO: 7,
    NAO_PALPITOU: 5,
    DOBROU_E_ACERTOU: 6,
  } as Record<string, number>,

  PRIORIDADE_POR_TIPO: {
    UNICO_NA_MOSCA: 1,
    NAO_PALPITOU: 2,
    SEQUENCIA_MOSCA: 3,
    SEQUENCIA_RESULTADO: 4,
    ACERTOU_EM_CHEIO: 5,
    SUBIU_RANKING: 6,
    DOBROU_E_ACERTOU: 7,
  } as Record<string, number>,

  CRON: {
    LIMPEZA_DIARIA: '0 5 * * *', // 02:00 BRT
  },

  MENSAGENS: {
    STORY_NAO_ENCONTRADO: 'Story não encontrado',
    STORY_FORA_DO_ESCOPO: 'Story não está mais visível',
    REACAO_APENAS_NAO_PALPITOU:
      'Reações do tipo F são permitidas apenas em stories NAO_PALPITOU',
    NAO_PODE_F_PARA_SI_MESMO: 'Não é permitido enviar F para si mesmo',
    USUARIO_JA_ENVIOU_F: 'Você já enviou um F para este story',
    F_ENVIADO_SUCESSO: 'F enviado com sucesso',
  },

  TEMPLATES: {
    NOVOS_STORIES: {
      titulo: 'Novos destaques!',
      mensagem: (grupoNome: string, quantidade: number) =>
        `${quantidade} novos destaques no grupo ${grupoNome}. Veja o que aconteceu!`,
    },
    RECEBEU_F: {
      titulo: 'Recebeu um F!',
      mensagem: (nomeRemetente: string) =>
        `${nomeRemetente} mandou um F pra você. 😴`,
    },
    RECEBEU_F_AGRUPADO: {
      titulo: 'Mandaram um F!',
      mensagem: (quantidade: number, timeCasa: string, timeFora: string) =>
        `${quantidade} pessoas mandaram um F — ${timeCasa} × ${timeFora}`,
    },
  },
} as const;

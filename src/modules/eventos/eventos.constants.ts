/**
 * Constantes do módulo Eventos (outbox pattern local).
 */

export const EVENTOS = {
  TAG: 'Eventos',
  REPOSITORY_TOKEN: 'EVENTO_PENDENTE_REPOSITORY',
  MAX_TENTATIVAS: 3,
  TIPOS: {
    RANKING_PROCESSAR: 'RANKING_PROCESSAR',
    NOTIFICACAO_ENVIAR: 'NOTIFICACAO_ENVIAR',
    CHAVEAMENTO_PROPAGAR: 'CHAVEAMENTO_PROPAGAR',
  },
  STATUS: {
    PENDENTE: 'PENDENTE',
    PROCESSANDO: 'PROCESSANDO',
    PROCESSADO: 'PROCESSADO',
    FALHA_DEFINITIVA: 'FALHA_DEFINITIVA',
  },
  MENSAGENS: {
    EVENTO_REGISTRADO: 'Evento registrado com sucesso',
    EVENTO_DUPLICADO: 'Evento já existe (idempotente)',
    FALHA_DEFINITIVA: 'Evento marcado como falha definitiva após exceder tentativas',
  },
} as const;

export type TipoEvento =
  | typeof EVENTOS.TIPOS.RANKING_PROCESSAR
  | typeof EVENTOS.TIPOS.NOTIFICACAO_ENVIAR
  | typeof EVENTOS.TIPOS.CHAVEAMENTO_PROPAGAR;

export type StatusEvento =
  | typeof EVENTOS.STATUS.PENDENTE
  | typeof EVENTOS.STATUS.PROCESSANDO
  | typeof EVENTOS.STATUS.PROCESSADO
  | typeof EVENTOS.STATUS.FALHA_DEFINITIVA;

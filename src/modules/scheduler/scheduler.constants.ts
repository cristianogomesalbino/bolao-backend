/**
 * Constantes do módulo Scheduler.
 * Centraliza intervalos, lock IDs, triggers e mensagens.
 */

// --- Tipos ---

export type TriggerOrigem = 'CRON' | 'SUPER_ADMIN' | 'API_KEY';

export const USE_CASES_PERMITIDOS = [
  'sincronizacao',
  'notificacoes',
  'limpeza',
  'eventos-pendentes',
] as const;

export type UseCasePermitido = (typeof USE_CASES_PERMITIDOS)[number];

// --- Lock IDs (pg_try_advisory_xact_lock) ---

export const LOCK_IDS = {
  SINCRONIZACAO: 1,
  EVENTOS_PENDENTES: 2,
} as const;

// --- Intervalos de sincronização (ms) ---

export const SYNC_INTERVALOS = {
  /** Jogos ao vivo — polling frequente */
  AO_VIVO_MS: 2 * 60 * 1000,
  /** Próximo jogo dentro de 5min — preparar */
  PROXIMO_IMINENTE_MS: 2 * 60 * 1000,
  /** Sem jogos próximos — verificar periodicamente */
  SEM_JOGOS_MS: 2 * 60 * 60 * 1000,
  /** Antecedência antes do jogo para ativar sync */
  ANTECEDENCIA_MS: 5 * 60 * 1000,
  /** Verificação de jogos adiados (remarcação leva dias) */
  ADIADOS_MS: 24 * 60 * 60 * 1000,
  /** Delay no startup para app estabilizar */
  STARTUP_DELAY_MS: 10 * 1000,
} as const;

// --- Configuração da API externa ---

export const API_EXTERNA_CONFIG = {
  TIMEOUT_MS: 10_000,
  MAX_RETRIES: 2,
  BACKOFF_MS: [1000, 3000] as readonly number[],
  ERROS_RETRYABLE: [408, 429, 500, 502, 503, 504] as readonly number[],
  ERROS_DEFINITIVOS: [400, 401, 403, 404] as readonly number[],
} as const;

// --- Módulo ---

export const SCHEDULER = {
  TAG: 'Scheduler',
  MENSAGENS: {
    SYNC_JA_EM_EXECUCAO: 'Sincronização já em execução, ignorada',
    SCHEDULER_DESABILITADO:
      'Scheduler desabilitado (SCHEDULER_HABILITADO != true)',
    USE_CASE_INVALIDO: 'Use case inválido',
    EXECUCAO_FORCADA: 'Execução forçada pelo admin',
  },
} as const;

// --- Interfaces de configuração multi-campeonato ---

import {
  CampeonatoNaoSuportadoError,
  FaseSlugInvalidaError,
  RodadaForaDoLimiteError,
} from '../../common/errors/domain-errors';

export interface TemaConfig {
  corPrimaria: string;
  corSecundaria: string;
}

export interface FaseConfig {
  slug: string;
  tipo: 'PONTOS_CORRIDOS' | 'MATA_MATA';
  maxRodadas: number;
}

export interface CampeonatoConfig {
  campeonatoId: string;
  slug: string;
  nome: string;
  tema: TemaConfig;
  fases: FaseConfig[];
  buildFaseSlug: (faseSlug: string) => string;
}

// --- Constantes da API externa ---

export const GE_BASE_URL = 'https://api.globoesporte.globo.com/tabela';

export const BRASILEIRAO_CAMPEONATO_ID = 'd1a37fa4-e948-43a6-ba53-ab24ab3a45b1';

export const COPA_DO_MUNDO_CAMPEONATO_ID =
  'b5ff9c28-476e-4816-a699-7645acc94cd0';

// --- Constantes da Copa do Mundo 2026 ---

export const COPA_TOTAL_GRUPOS = 12;
export const COPA_TIMES_POR_GRUPO = 4;

export const COPA_FASES = {
  FASE_DE_GRUPOS: 'fase-de-grupos-copa-do-mundo-2026',
  SEGUNDA_FASE: 'segunda-fase-copa-do-mundo-2026',
  OITAVAS: 'oitavas-de-final-copa-do-mundo-2026',
  QUARTAS: 'quartas-de-final-copa-do-mundo-2026',
  SEMIFINAIS: 'semifinais-copa-do-mundo-2026',
  TERCEIRO_LUGAR: 'disputa-terceiro-lugar-copa-do-mundo-2026',
  FINAL: 'final-copa-do-mundo-2026',
} as const;

/**
 * Definição das fases eliminatórias com metadados.
 * totalJogos: quantos confrontos a fase tem.
 * O sistema descobre a próxima fase a preencher pela ordem no banco
 * e valida se os classificados estão disponíveis pelo totalJogos da fase anterior.
 */
export interface FaseEliminatoriaConfig {
  nome: string;
  slug: string;
  totalJogos: number;
  origem: 'grupos' | 'fase-anterior';
}

export const COPA_FASES_ELIMINATORIAS: FaseEliminatoriaConfig[] = [
  {
    nome: '16 Avos de Final',
    slug: COPA_FASES.SEGUNDA_FASE,
    totalJogos: 16,
    origem: 'grupos',
  },
  {
    nome: 'Oitavas de Final',
    slug: COPA_FASES.OITAVAS,
    totalJogos: 8,
    origem: 'fase-anterior',
  },
  {
    nome: 'Quartas de Final',
    slug: COPA_FASES.QUARTAS,
    totalJogos: 4,
    origem: 'fase-anterior',
  },
  {
    nome: 'Semifinais',
    slug: COPA_FASES.SEMIFINAIS,
    totalJogos: 2,
    origem: 'fase-anterior',
  },
  {
    nome: 'Disputa 3º Lugar',
    slug: COPA_FASES.TERCEIRO_LUGAR,
    totalJogos: 1,
    origem: 'fase-anterior',
  },
  {
    nome: 'Final',
    slug: COPA_FASES.FINAL,
    totalJogos: 1,
    origem: 'fase-anterior',
  },
];

/**
 * Chaveamento dos 16 avos de final da Copa do Mundo 2026.
 * Cada entrada mapeia a rodada (1-16) para as posições dos times.
 * Formato: { rodada, casa: '1A' | '2F' | '3ABCDF', fora: idem }
 * '1A' = 1º do grupo A, '2F' = 2º do grupo F, '3ABCDF' = melhor 3º entre esses grupos
 */
export const COPA_CHAVEAMENTO_16AVOS: {
  rodada: number;
  casa: string;
  fora: string;
}[] = [
  { rodada: 1, casa: '2A', fora: '2B' }, // AFS x CAN
  { rodada: 2, casa: '1C', fora: '2F' }, // BRA x 2ºF
  { rodada: 3, casa: '1E', fora: '3ABCDF' }, // ALE x 3º
  { rodada: 4, casa: '1F', fora: '2C' }, // 1ºF x MAR
  { rodada: 5, casa: '2E', fora: '2I' }, // 2ºE x 2ºI
  { rodada: 6, casa: '1I', fora: '3CDFGH' }, // 1ºI x 3º
  { rodada: 7, casa: '1A', fora: '3CEFHI' }, // MEX x 3º
  { rodada: 8, casa: '1L', fora: '3EHIJK' }, // 1ºL x 3º
  { rodada: 9, casa: '1G', fora: '3AEHIJ' }, // 1ºG x 3º
  { rodada: 10, casa: '1D', fora: '3BEFIJ' }, // EUA x 3º
  { rodada: 11, casa: '1H', fora: '2J' }, // 1ºH x 2ºJ
  { rodada: 12, casa: '2K', fora: '2L' }, // 2ºK x 2ºL
  { rodada: 13, casa: '1B', fora: '3EFGIJ' }, // SUI x 3º
  { rodada: 14, casa: '2D', fora: '2G' }, // 2ºD x 2ºG
  { rodada: 15, casa: '1J', fora: '2H' }, // ARG x 2ºH
  { rodada: 16, casa: '1K', fora: '3DEIJL' }, // 1ºK x 3º
];

// --- Registry de configurações de campeonato ---

export const CAMPEONATO_CONFIGS: Record<string, CampeonatoConfig> = {
  brasileirao: {
    campeonatoId: BRASILEIRAO_CAMPEONATO_ID,
    slug: 'brasileirao',
    nome: 'Campeonato Brasileiro Série A',
    tema: { corPrimaria: '#1B5E20', corSecundaria: '#FFFFFF' },
    fases: [
      {
        slug: 'fase-unica-campeonato-brasileiro-2025',
        tipo: 'PONTOS_CORRIDOS',
        maxRodadas: 38,
      },
      {
        slug: 'fase-unica-campeonato-brasileiro-2026',
        tipo: 'PONTOS_CORRIDOS',
        maxRodadas: 38,
      },
    ],
    buildFaseSlug: (faseSlug: string) => faseSlug,
  },
  'copa-do-mundo-2026': {
    campeonatoId: COPA_DO_MUNDO_CAMPEONATO_ID,
    slug: 'copa-do-mundo-2026',
    nome: 'Copa do Mundo FIFA 2026',
    tema: { corPrimaria: '#009739', corSecundaria: '#FEDD00' },
    fases: [
      {
        slug: COPA_FASES.FASE_DE_GRUPOS,
        tipo: 'PONTOS_CORRIDOS',
        maxRodadas: 3,
      },
      { slug: COPA_FASES.SEGUNDA_FASE, tipo: 'MATA_MATA', maxRodadas: 16 },
      { slug: COPA_FASES.OITAVAS, tipo: 'MATA_MATA', maxRodadas: 1 },
      { slug: COPA_FASES.QUARTAS, tipo: 'MATA_MATA', maxRodadas: 1 },
      { slug: COPA_FASES.SEMIFINAIS, tipo: 'MATA_MATA', maxRodadas: 1 },
      { slug: COPA_FASES.TERCEIRO_LUGAR, tipo: 'MATA_MATA', maxRodadas: 1 },
      { slug: COPA_FASES.FINAL, tipo: 'MATA_MATA', maxRodadas: 1 },
    ],
    buildFaseSlug: (faseSlug: string) => faseSlug,
  },
};

// --- Funções utilitárias ---

export const CAMPEONATO_SLUGS = Object.keys(CAMPEONATO_CONFIGS);
export type CampeonatoSlug = keyof typeof CAMPEONATO_CONFIGS;

export function obterCampeonatoConfig(slug: string): CampeonatoConfig {
  const config = CAMPEONATO_CONFIGS[slug];
  if (!config) {
    throw new CampeonatoNaoSuportadoError(slug);
  }
  return config;
}

export function obterFaseConfig(
  config: CampeonatoConfig,
  faseSlug: string,
): FaseConfig {
  const fase = config.fases.find((f) => f.slug === faseSlug);
  if (!fase) {
    throw new FaseSlugInvalidaError(faseSlug, config.slug);
  }
  return fase;
}

export function validarRodada(rodada: number, faseConfig: FaseConfig): void {
  if (rodada < 1 || rodada > faseConfig.maxRodadas) {
    throw new RodadaForaDoLimiteError(
      rodada,
      faseConfig.maxRodadas,
      faseConfig.slug,
    );
  }
}

// --- Constantes de sincronização automática ---

export const SYNC = {
  INTERVALO_COM_JOGOS_AO_VIVO_MS: 2 * 60 * 1000, // 2 minutos
  INTERVALO_PROXIMO_JOGO_MS: 5 * 60 * 1000, // 5 minutos
  INTERVALO_SEM_JOGOS_MS: 15 * 60 * 1000, // 15 minutos
  ANTECEDENCIA_INICIO_MS: 5 * 60 * 1000, // 5 minutos antes do jogo começa a sincronizar
  CRON_VERIFICACAO: '*/1 * * * *', // A cada 1 minuto verifica se deve sincronizar
  LOG_REPOSITORY_TOKEN: 'LOG_SINCRONIZACAO_REPOSITORY',
} as const;

// --- Constantes do módulo ---

export const JOGOS = {
  TAG: 'Jogos',
  FASE_REPOSITORY_TOKEN: 'FASE_REPOSITORY',
  JOGO_REPOSITORY_TOKEN: 'JOGO_REPOSITORY',
  LOG_SINCRONIZACAO_REPOSITORY_TOKEN: 'LOG_SINCRONIZACAO_REPOSITORY',
  MENSAGENS: {
    FASE_NAO_ENCONTRADA: 'Fase não encontrada',
    JOGO_NAO_ENCONTRADO: 'Jogo não encontrado',
    TIMES_IGUAIS: 'Time da casa e time visitante devem ser diferentes',
    JOGO_FINALIZADO: 'Não é possível alterar um jogo finalizado',
    JOGO_CANCELADO: 'Não é possível alterar um jogo cancelado',
    PLACAR_INVALIDO: 'Placar deve ser um número inteiro não negativo',
    PRORROGACAO_NAO_PERMITIDA: 'Prorrogação não é permitida neste tipo de fase',
    PENALTIS_NAO_PERMITIDO:
      'Pênaltis não são permitidos sem empate na prorrogação',
    PLACAR_PENALTIS_EMPATADO: 'Placar de pênaltis não pode ser empatado',
    VENCEDOR_OBRIGATORIO:
      'É obrigatório definir um vencedor em jogos de mata-mata',
    TRANSICAO_STATUS_INVALIDA: 'Transição de status inválida',
    IDA_VOLTA_NAO_PERMITIDA:
      'Jogos de ida e volta não são permitidos nesta fase',
    JOGO_IDA_NAO_ENCONTRADO: 'Jogo de ida não encontrado para este confronto',
    API_EXTERNA_INDISPONIVEL:
      'API externa de futebol está indisponível no momento',
    CAMPEONATO_NAO_SUPORTADO: 'Campeonato não é suportado',
    RODADA_FORA_DO_LIMITE: 'Rodada excede o limite para a fase',
    FASE_SLUG_INVALIDA: 'Fase não é válida para o campeonato',
  },
} as const;

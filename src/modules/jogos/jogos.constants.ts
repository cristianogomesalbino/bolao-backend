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

export const COPA_DO_MUNDO_CAMPEONATO_ID = 'b5ff9c28-476e-4816-a699-7645acc94cd0';

// --- Constantes da Copa do Mundo 2026 ---

export const COPA_TOTAL_GRUPOS = 12;
export const COPA_TIMES_POR_GRUPO = 4;

export const COPA_FASES = {
  FASE_DE_GRUPOS: 'fase-de-grupos-copa-do-mundo-2026',
  TRINTA_E_DOIS_AVOS: '32avos-de-final-copa-do-mundo-2026',
  OITAVAS: 'oitavas-de-final-copa-do-mundo-2026',
  QUARTAS: 'quartas-de-final-copa-do-mundo-2026',
  SEMIFINAIS: 'semifinais-copa-do-mundo-2026',
  TERCEIRO_LUGAR: 'disputa-terceiro-lugar-copa-do-mundo-2026',
  FINAL: 'final-copa-do-mundo-2026',
} as const;

// --- Registry de configurações de campeonato ---

export const CAMPEONATO_CONFIGS: Record<string, CampeonatoConfig> = {
  brasileirao: {
    campeonatoId: BRASILEIRAO_CAMPEONATO_ID,
    slug: 'brasileirao',
    nome: 'Campeonato Brasileiro Série A',
    tema: { corPrimaria: '#1B5E20', corSecundaria: '#FFFFFF' },
    fases: [
      { slug: 'fase-unica-campeonato-brasileiro-2025', tipo: 'PONTOS_CORRIDOS', maxRodadas: 38 },
      { slug: 'fase-unica-campeonato-brasileiro-2026', tipo: 'PONTOS_CORRIDOS', maxRodadas: 38 },
    ],
    buildFaseSlug: (faseSlug: string) => faseSlug,
  },
  'copa-do-mundo-2026': {
    campeonatoId: COPA_DO_MUNDO_CAMPEONATO_ID,
    slug: 'copa-do-mundo-2026',
    nome: 'Copa do Mundo FIFA 2026',
    tema: { corPrimaria: '#009739', corSecundaria: '#FEDD00' },
    fases: [
      { slug: COPA_FASES.FASE_DE_GRUPOS, tipo: 'PONTOS_CORRIDOS', maxRodadas: 3 },
      { slug: COPA_FASES.TRINTA_E_DOIS_AVOS, tipo: 'MATA_MATA', maxRodadas: 1 },
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

export function obterFaseConfig(config: CampeonatoConfig, faseSlug: string): FaseConfig {
  const fase = config.fases.find((f) => f.slug === faseSlug);
  if (!fase) {
    throw new FaseSlugInvalidaError(faseSlug, config.slug);
  }
  return fase;
}

export function validarRodada(rodada: number, faseConfig: FaseConfig): void {
  if (rodada < 1 || rodada > faseConfig.maxRodadas) {
    throw new RodadaForaDoLimiteError(rodada, faseConfig.maxRodadas, faseConfig.slug);
  }
}

// --- Constantes do módulo ---

export const JOGOS = {
  TAG: 'Jogos',
  FASE_REPOSITORY_TOKEN: 'FASE_REPOSITORY',
  JOGO_REPOSITORY_TOKEN: 'JOGO_REPOSITORY',
  MENSAGENS: {
    FASE_NAO_ENCONTRADA: 'Fase não encontrada',
    JOGO_NAO_ENCONTRADO: 'Jogo não encontrado',
    TIMES_IGUAIS: 'Time da casa e time visitante devem ser diferentes',
    JOGO_FINALIZADO: 'Não é possível alterar um jogo finalizado',
    JOGO_CANCELADO: 'Não é possível alterar um jogo cancelado',
    PLACAR_INVALIDO: 'Placar deve ser um número inteiro não negativo',
    PRORROGACAO_NAO_PERMITIDA: 'Prorrogação não é permitida neste tipo de fase',
    PENALTIS_NAO_PERMITIDO: 'Pênaltis não são permitidos sem empate na prorrogação',
    PLACAR_PENALTIS_EMPATADO: 'Placar de pênaltis não pode ser empatado',
    VENCEDOR_OBRIGATORIO: 'É obrigatório definir um vencedor em jogos de mata-mata',
    TRANSICAO_STATUS_INVALIDA: 'Transição de status inválida',
    IDA_VOLTA_NAO_PERMITIDA: 'Jogos de ida e volta não são permitidos nesta fase',
    JOGO_IDA_NAO_ENCONTRADO: 'Jogo de ida não encontrado para este confronto',
    API_EXTERNA_INDISPONIVEL: 'API externa de futebol está indisponível no momento',
    CAMPEONATO_NAO_SUPORTADO: 'Campeonato não é suportado',
    RODADA_FORA_DO_LIMITE: 'Rodada excede o limite para a fase',
    FASE_SLUG_INVALIDA: 'Fase não é válida para o campeonato',
  },
} as const;

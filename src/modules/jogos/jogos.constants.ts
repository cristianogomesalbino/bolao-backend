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
  OITAVAS: 'oitavas-copa-do-mundo-2026',
  QUARTAS: 'quartas-copa-do-mundo-2026',
  SEMIFINAIS: 'semifinal-copa-do-mundo-2026',
  TERCEIRO_LUGAR: 'terceiro-copa-do-mundo-2026',
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
 * Tabela de alocação dos melhores 3ºs colocados por combinação de grupos.
 * Chave: letras dos 8 grupos classificados (ordenadas alfabeticamente).
 * Valor: array com o grupo do 3º alocado em cada match, na ordem:
 *   [M74(R3), M77(R6), M79(R7), M80(R8), M81(R10), M82(R9), M85(R13), M87(R16)]
 * Fonte: FIFA World Cup 2026 Regulations, Annex C (495 combinações).
 * Apenas as combinações mais prováveis estão incluídas.
 */
export const TABELA_ALOCACAO_TERCEIROS: Record<string, string[]> = {
  // Combinação real da Copa 2026: B, D, E, F, I, J, K, L
  // Corrigido conforme chaveamento oficial FIFA publicado (Fox Sports / Sporting News)
  BDEFIJKL: ['D', 'F', 'E', 'K', 'B', 'I', 'J', 'L'],
  // Variantes próximas (se algum grupo diferente se classificar)
  ABDEFIJK: ['E', 'G', 'B', 'D', 'A', 'F', 'I', 'K'],
  ABDEFIJL: ['E', 'J', 'B', 'D', 'A', 'F', 'L', 'I'],
  ABDEFGIJ: ['E', 'G', 'B', 'D', 'A', 'F', 'I', 'J'],
  ABCDEFIJ: ['C', 'J', 'B', 'D', 'A', 'F', 'E', 'I'],
  ABCDEFGK: ['C', 'G', 'B', 'D', 'A', 'F', 'E', 'K'],
  ABCDEFGH: ['H', 'G', 'B', 'C', 'A', 'F', 'D', 'E'],
  ABCDEFGI: ['C', 'G', 'B', 'D', 'A', 'F', 'E', 'I'],
  ABCDEFGJ: ['C', 'G', 'B', 'D', 'A', 'F', 'E', 'J'],
  ABCDEFGL: ['C', 'G', 'B', 'D', 'A', 'F', 'L', 'E'],
  ABCDEFHI: ['H', 'G', 'B', 'C', 'A', 'F', 'D', 'I'],
  ABCDEFHJ: ['H', 'J', 'B', 'C', 'A', 'F', 'D', 'E'],
  ABCDEFHK: ['H', 'E', 'B', 'C', 'A', 'F', 'D', 'K'],
  ABCDEFHL: ['H', 'F', 'B', 'C', 'A', 'D', 'L', 'E'],
  ABCDEFIK: ['C', 'E', 'B', 'D', 'A', 'F', 'I', 'K'],
  ABCDEFIL: ['C', 'E', 'B', 'D', 'A', 'F', 'L', 'I'],
  ABCDEFJK: ['C', 'J', 'B', 'D', 'A', 'F', 'E', 'K'],
  ABCDEFJL: ['C', 'J', 'B', 'D', 'A', 'F', 'L', 'E'],
  ABCDEFKL: ['C', 'E', 'B', 'D', 'A', 'F', 'L', 'K'],
  ABCDEGHI: ['H', 'G', 'B', 'C', 'A', 'D', 'E', 'I'],
  ABCDEGHJ: ['H', 'G', 'B', 'C', 'A', 'D', 'E', 'J'],
  ABCDEGHK: ['H', 'G', 'B', 'C', 'A', 'D', 'E', 'K'],
  ABCDEGHL: ['H', 'G', 'B', 'C', 'A', 'D', 'L', 'E'],
  ABCDEGIJ: ['E', 'G', 'B', 'C', 'A', 'D', 'I', 'J'],
  ABCDEGIK: ['E', 'G', 'B', 'C', 'A', 'D', 'I', 'K'],
  ABCDEGIL: ['E', 'G', 'B', 'C', 'A', 'D', 'L', 'I'],
  ABCDEGJK: ['E', 'G', 'B', 'C', 'A', 'D', 'J', 'K'],
  ABCDEGJL: ['H', 'G', 'B', 'C', 'A', 'D', 'E', 'J'],
  ABCDEGKL: ['H', 'G', 'B', 'C', 'A', 'D', 'E', 'K'],
  ABCDEHIJ: ['H', 'J', 'B', 'C', 'A', 'D', 'E', 'I'],
  ABCDEHIK: ['H', 'E', 'B', 'C', 'A', 'D', 'I', 'K'],
  ABCDEHIL: ['H', 'E', 'B', 'C', 'A', 'D', 'L', 'I'],
  ABCDEHJK: ['H', 'J', 'B', 'C', 'A', 'D', 'E', 'K'],
  ABCDEHJL: ['H', 'J', 'B', 'C', 'A', 'D', 'L', 'E'],
  ABCDEHKL: ['H', 'E', 'B', 'C', 'A', 'D', 'L', 'K'],
  ABCDEIJK: ['E', 'J', 'B', 'C', 'A', 'D', 'I', 'K'],
  ABCDEIJL: ['E', 'J', 'B', 'C', 'A', 'D', 'L', 'I'],
  ABCDEIKL: ['E', 'G', 'B', 'C', 'A', 'D', 'L', 'K'],
  ABCDEJKL: ['H', 'J', 'B', 'C', 'A', 'D', 'E', 'K'],
};

/**
 * Chaveamento dos 16 avos de final (Round of 32) da Copa do Mundo 2026.
 * Baseado no bracket oficial da FIFA (matches 73-88).
 * Fonte: FIFA Match Schedule (digitalhub.fifa.com/m/1be9ce37eb98fcc5/original/FWC26-Match-Schedule_English.pdf)
 * Cada entrada mapeia a rodada (1-16) para as posições dos times e horário UTC.
 */
export const COPA_CHAVEAMENTO_16AVOS: {
  rodada: number;
  casa: string;
  fora: string;
  dataHora: string;
}[] = [
  { rodada: 1, casa: '2A', fora: '2B', dataHora: '2026-06-28T19:00:00Z' }, // M73: África do Sul x Canadá
  { rodada: 2, casa: '1C', fora: '2F', dataHora: '2026-06-29T17:00:00Z' }, // M76: Brasil x Japão
  { rodada: 3, casa: '1E', fora: '3ABCDF', dataHora: '2026-06-29T20:30:00Z' }, // M74: Alemanha x Paraguai
  { rodada: 4, casa: '1F', fora: '2C', dataHora: '2026-06-30T01:00:00Z' }, // M75: Holanda x Marrocos
  { rodada: 5, casa: '2E', fora: '2I', dataHora: '2026-06-30T17:00:00Z' }, // M78: Costa do Marfim x Noruega
  { rodada: 6, casa: '1I', fora: '3CDFGH', dataHora: '2026-06-30T21:00:00Z' }, // M77: França x Suécia
  { rodada: 7, casa: '1A', fora: '3CEFHI', dataHora: '2026-07-01T01:00:00Z' }, // M79: México x 3º C/E/F/H/I
  { rodada: 8, casa: '1L', fora: '3EHIJK', dataHora: '2026-07-01T16:00:00Z' }, // M80: 1L x 3º E/H/I/J/K
  { rodada: 9, casa: '1G', fora: '3AEHIJ', dataHora: '2026-07-01T20:00:00Z' }, // M82: Bélgica x 3º A/E/H/I/J
  { rodada: 10, casa: '1D', fora: '3BEFIJ', dataHora: '2026-07-02T00:00:00Z' }, // M81: EUA x Bósnia
  { rodada: 11, casa: '1H', fora: '2J', dataHora: '2026-07-02T19:00:00Z' }, // M84: Espanha x 2J
  { rodada: 12, casa: '2K', fora: '2L', dataHora: '2026-07-02T23:00:00Z' }, // M83: 2K x 2L
  { rodada: 13, casa: '1B', fora: '3EFGIJ', dataHora: '2026-07-03T03:00:00Z' }, // M85: Suíça x 3º E/F/G/I/J
  { rodada: 14, casa: '2D', fora: '2G', dataHora: '2026-07-03T18:00:00Z' }, // M88: Austrália x Egito
  { rodada: 15, casa: '1J', fora: '2H', dataHora: '2026-07-03T22:00:00Z' }, // M86: Argentina x Cabo Verde
  { rodada: 16, casa: '1K', fora: '3DEIJL', dataHora: '2026-07-04T01:30:00Z' }, // M87: 1K x 3º D/E/I/J/L
];

/**
 * Bracket das fases seguintes da Copa 2026.
 * Cada entrada: rodada da fase, vencedor de qual rodada da fase anterior (casa/fora).
 * Baseado no chaveamento oficial FIFA.
 */
export const COPA_BRACKET_OITAVAS: {
  rodada: number;
  casaOrigem: number;
  foraOrigem: number;
  dataHora: string;
}[] = [
  // M89: W75(HOL/MAR) vs W73(CAN) — Jul 4 Houston
  { rodada: 1, casaOrigem: 4, foraOrigem: 1, dataHora: '2026-07-04T17:00:00Z' },
  // M90: W77(FRA/SUE) vs W74(ALE/PAR) — Jul 4 Philadelphia
  { rodada: 2, casaOrigem: 6, foraOrigem: 3, dataHora: '2026-07-04T21:00:00Z' },
  // M91: W76(BRA) vs W78(CDM/NOR) — Jul 5 NY/NJ
  { rodada: 3, casaOrigem: 2, foraOrigem: 5, dataHora: '2026-07-05T20:00:00Z' },
  // M92: W79(MEX/EQU) vs W80(ING/RDC) — Jul 5 Mexico City
  { rodada: 4, casaOrigem: 7, foraOrigem: 8, dataHora: '2026-07-06T00:00:00Z' },
  // M93: W83(POR/CRO) vs W84(ESP/AUT) — Jul 6 Dallas
  {
    rodada: 5,
    casaOrigem: 12,
    foraOrigem: 11,
    dataHora: '2026-07-06T19:00:00Z',
  },
  // M94: W81(EUA/BOS) vs W82(BEL/SEN) — Jul 6 Seattle
  {
    rodada: 6,
    casaOrigem: 10,
    foraOrigem: 9,
    dataHora: '2026-07-07T00:00:00Z',
  },
  // M95: W86(ARG/CAB) vs W88(AUS/EGI) — Jul 7 Atlanta
  {
    rodada: 7,
    casaOrigem: 15,
    foraOrigem: 14,
    dataHora: '2026-07-07T16:00:00Z',
  },
  // M96: W85(SUI/AGL) vs W87(COL/GAN) — Jul 7 Vancouver
  {
    rodada: 8,
    casaOrigem: 13,
    foraOrigem: 16,
    dataHora: '2026-07-07T20:00:00Z',
  },
];

export const COPA_BRACKET_QUARTAS: {
  rodada: number;
  casaOrigem: number;
  foraOrigem: number;
  dataHora: string;
}[] = [
  { rodada: 1, casaOrigem: 1, foraOrigem: 2, dataHora: '2026-07-09T20:00:00Z' },
  { rodada: 2, casaOrigem: 3, foraOrigem: 4, dataHora: '2026-07-10T19:00:00Z' },
  { rodada: 3, casaOrigem: 5, foraOrigem: 6, dataHora: '2026-07-11T21:00:00Z' },
  { rodada: 4, casaOrigem: 7, foraOrigem: 8, dataHora: '2026-07-12T01:00:00Z' },
];

export const COPA_BRACKET_SEMIS: {
  rodada: number;
  casaOrigem: number;
  foraOrigem: number;
  dataHora: string;
}[] = [
  { rodada: 1, casaOrigem: 1, foraOrigem: 3, dataHora: '2026-07-14T19:00:00Z' },
  { rodada: 2, casaOrigem: 2, foraOrigem: 4, dataHora: '2026-07-15T19:00:00Z' },
];

export const COPA_BRACKET_FINAL: {
  rodada: number;
  casaOrigem: number;
  foraOrigem: number;
  dataHora: string;
}[] = [
  { rodada: 1, casaOrigem: 1, foraOrigem: 2, dataHora: '2026-07-19T19:00:00Z' },
];

export const COPA_BRACKET_TERCEIRO: {
  rodada: number;
  casaOrigem: number;
  foraOrigem: number;
  dataHora: string;
}[] = [
  { rodada: 1, casaOrigem: 1, foraOrigem: 2, dataHora: '2026-07-18T21:00:00Z' },
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
  LIMITE_RODADA_MATA_MATA: 9999,
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

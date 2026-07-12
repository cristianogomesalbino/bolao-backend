export type TipoStory =
  | 'ACERTOU_EM_CHEIO'
  | 'UNICO_NA_MOSCA'
  | 'SUBIU_RANKING'
  | 'SEQUENCIA_MOSCA'
  | 'SEQUENCIA_RESULTADO'
  | 'NAO_PALPITOU'
  | 'DOBROU_E_ACERTOU';

export type CategoriaRecorde = 'MOSCA' | 'RESULTADO';

// --- StoryTitle (catálogo de títulos) ---

export interface StoryTitle {
  readonly id: string;
  readonly title: string;
  readonly emoji: string;
  readonly rarity?: 'common' | 'rare' | 'epic';
}

// --- Dados JSONB por tipo ---

export interface TimeInfo {
  nome: string;
  sigla: string;
  escudo: string | null;
}

export interface DadosAcertouEmCheio {
  golsCasa: number;
  golsFora: number;
  timeCasa: TimeInfo;
  timeFora: TimeInfo;
}

export interface DadosUnicoNaMosca {
  golsCasa: number;
  golsFora: number;
  timeCasa: TimeInfo;
  timeFora: TimeInfo;
  rodada: number | null;
}

export interface DadosSubiuRanking {
  posicaoAnterior: number;
  posicaoNova: number;
  top5: Array<{ posicao: number; nome: string; pontuacao: number }>;
}

export interface JogoSequencia {
  timeCasa: string;
  timeFora: string;
  golsCasa: number;
  golsFora: number;
  rodada: number | null;
  acertou: boolean;
}

export interface RecordeInfo {
  valor: number;
  detentores: Array<{ nome: string; usuarioId: string }>;
  ehNovoRecorde: boolean;
}

export interface DadosSequenciaMosca {
  quantidadeAcertos: number;
  ultimosJogos: Array<JogoSequencia & { acertouEmCheio: boolean }>;
  recorde: RecordeInfo;
}

export interface DadosSequenciaResultado {
  quantidadeAcertos: number;
  rodadaInicio: number | null;
  rodadaFim: number | null;
  ultimosJogos: JogoSequencia[];
  recorde: RecordeInfo;
}

export interface JogoEsquecido {
  jogoId: string;
  timeCasa: TimeInfo;
  timeFora: TimeInfo;
  golsCasa: number | null;
  golsFora: number | null;
}

export interface DadosNaoPalpitou {
  jogosEsquecidos: JogoEsquecido[];
  totalJogosRodada: number;
  rodada: number | null;
}

export interface DadosDobrouEAcertou {
  golsCasa: number;
  golsFora: number;
  timeCasa: TimeInfo;
  timeFora: TimeInfo;
  pontosObtidos: number;
}

// --- Tipos de contexto para o Generator ---

export interface JogoComTimes {
  id: string;
  faseId: string;
  rodada: number | null;
  status: string;
  golsCasa: number | null;
  golsFora: number | null;
  timeCasaId: string;
  timeForaId: string;
  dataHora: Date | string | null;
  timeCasa: { id: string; nome: string; sigla: string; escudo: string | null };
  timeFora: { id: string; nome: string; sigla: string; escudo: string | null };
}

export interface GrupoBasico {
  id: string;
  nome: string;
  temporadaId: string;
  permitirPalpiteDobrado: boolean;
}

export interface MembroComUsuario {
  usuarioId: string;
  grupoId: string;
  usuario: { id: string; nome: string };
}

// --- Tipos de resposta ---

export interface StoryAutor {
  usuarioId: string;
  nome: string;
  avatar: string | null;
}

export interface StoryItemListagem {
  id: string;
  tipo: TipoStory;
  titulo: string;
  dados: Record<string, unknown>;
  jogoId: string;
  rodada: number | null;
  criadoEm: string;
  contadorFs: number;
  jaEnviouF: boolean;
  visualizado: boolean;
  autor: StoryAutor;
}

export interface StoryListagemResponse {
  stories: StoryItemListagem[];
  grupoNome?: string;
}

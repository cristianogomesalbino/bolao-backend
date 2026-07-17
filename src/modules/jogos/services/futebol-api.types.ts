/**
 * Tipos para a integração com a API do ge.globo.com.
 * Separado do service para reutilização em jogo.service.ts e chaveamento.service.ts.
 */

// --- Tipos da resposta RAW da API do GE ---

export interface JogoApiRawEquipe {
  readonly id: number;
  readonly nome_popular: string;
  readonly sigla: string;
  readonly escudo: string;
}

export interface JogoApiRawTransmissao {
  readonly broadcast?: {
    readonly id?: string;
  };
}

export interface JogoApiRaw {
  readonly id: number;
  readonly data_realizacao: string | null;
  readonly hora_realizacao?: string | null;
  readonly equipes: {
    readonly mandante: JogoApiRawEquipe;
    readonly visitante: JogoApiRawEquipe;
  };
  readonly placar_oficial_mandante?: number | null;
  readonly placar_oficial_visitante?: number | null;
  readonly placar_penaltis_mandante?: number | null;
  readonly placar_penaltis_visitante?: number | null;
  readonly transmissao?: JogoApiRawTransmissao;
  readonly jogo_ja_comecou?: boolean;
}

// --- Tipo de saída do normalizarJogo ---

export interface TimeNormalizado {
  readonly externoId: string;
  readonly nome: string;
  readonly sigla: string;
  readonly escudo: string;
}

export interface JogoNormalizado {
  readonly externoId: string;
  readonly dataHora: string | null;
  readonly status: string;
  readonly timeCasaId: string;
  readonly timeForaId: string;
  readonly golsCasa: number | null;
  readonly golsFora: number | null;
  readonly penaltisCasa: number | null;
  readonly penaltisFora: number | null;
  readonly timeCasa: TimeNormalizado;
  readonly timeFora: TimeNormalizado;
}

// --- Tipo de saída da classificação ---

export interface ClassificacaoItem {
  readonly posicao: number;
  readonly timeId: string;
  readonly nome: string;
  readonly sigla: string;
  readonly escudo: string | null;
  readonly pontos: number;
  readonly jogos: number;
  readonly vitorias: number;
  readonly empates: number;
  readonly derrotas: number;
  readonly golsPro: number;
  readonly golsContra: number;
  readonly saldoGols: number;
  readonly recentForm?: string[];
}

// --- Tipos internos da API (classificação GE raw) ---

export interface ClassificacaoGeRawItem {
  readonly ordem: number;
  readonly equipe_id: number;
  readonly nome_popular?: string;
  readonly nome?: string;
  readonly sigla?: string;
  readonly escudo?: string | null;
  readonly pontos?: number;
  readonly jogos?: number;
  readonly vitorias?: number;
  readonly empates?: number;
  readonly derrotas?: number;
  readonly gols_pro?: number;
  readonly gols_contra?: number;
  readonly saldo_gols?: number;
}

export interface ClassificacaoGeRawGrupo {
  readonly classificacao?: ClassificacaoGeRawItem[];
}

// --- Tipos da estrutura eliminatória (seções/chaves) ---

export interface SecaoJogoRaw {
  readonly id?: number;
  readonly data_realizacao?: string | null;
  readonly hora_realizacao?: string | null;
  readonly equipes?: {
    readonly mandante?: { readonly id?: number };
    readonly visitante?: { readonly id?: number };
  };
  readonly [key: string]: unknown;
}

export interface ChaveRaw {
  readonly jogos?: SecaoJogoRaw[];
}

export interface SecaoRaw {
  readonly chave?: ChaveRaw[];
}

export interface ClassificacaoEliminatoriaRaw {
  readonly secao?: SecaoRaw[];
}

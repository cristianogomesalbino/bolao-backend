export interface JogoNotif {
  id: string;
  faseId: string;
  rodada: number | null;
  status: string;
  dataHora: Date | string | null;
  golsCasa: number | null;
  golsFora: number | null;
  timeCasaId: string;
  timeForaId: string;
  timeCasa?: { id: string; nome: string; sigla: string } | null;
  timeFora?: { id: string; nome: string; sigla: string } | null;
  vencedorId?: string | null;
}

export interface FaseNotif {
  id: string;
  nome: string;
  tipo: string;
  temporadaId: string;
  temporada?: { campeonato?: { nome: string } | null } | null;
}

export interface GrupoNotif {
  id: string;
  nome: string;
  temporadaId: string;
  permitirPalpiteDobrado?: boolean;
}

export interface PalpiteNotif {
  id: string;
  usuarioId: string;
  jogoId: string;
  golsCasa: number;
  golsFora: number;
}

export interface MembroNotif {
  usuarioId: string;
  grupoId: string;
}

export interface RankingEntry {
  usuarioId: string;
  pontuacaoTotal: number;
  posicao: number;
}

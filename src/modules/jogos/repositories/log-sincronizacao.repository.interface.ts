export type StatusSincronizacao = 'SUCESSO' | 'PARCIAL' | 'ERRO' | 'SEM_JOGOS';

export interface LogSincronizacao {
  id: string;
  campeonatoSlug: string;
  fasesIds: string[];
  totalJogos: number;
  sincronizados: number;
  erros: number;
  status: StatusSincronizacao;
  mensagem: string | null;
  duracaoMs: number;
  dataCriacao: Date;
  detalhes: any;
}

export interface CriarLogSincronizacaoData {
  campeonatoSlug: string;
  fasesIds: string[];
  totalJogos: number;
  sincronizados: number;
  erros?: number;
  status: StatusSincronizacao;
  mensagem?: string;
  duracaoMs: number;
  detalhes?: any;
}

export interface LogSincronizacaoRepository {
  criar(data: CriarLogSincronizacaoData): Promise<LogSincronizacao>;
  buscarRecentes(limite?: number): Promise<LogSincronizacao[]>;
  buscarPorCampeonato(campeonatoSlug: string, limite?: number): Promise<LogSincronizacao[]>;
  buscarUltimaSincronizacao(campeonatoSlug: string): Promise<LogSincronizacao | null>;
}

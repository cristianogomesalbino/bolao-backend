export type TipoNotificacao =
  | 'JOGO_PROXIMO'
  | 'RODADA_ENCERRADA'
  | 'ACERTO_EM_CHEIO'
  | 'SUBIU_POSICAO'
  | 'DESCEU_POSICAO'
  | 'PALPITES_PENDENTES'
  | 'JOGO_LIBERADO';

export interface CriarNotificacaoData {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  usuarioId: string;
  jogoId?: string;
  grupoId?: string | null;
  faseId?: string;
  rodada?: number;
}

export interface ListarFiltros {
  status?: 'NAO_LIDA' | 'LIDA';
  limit: number;
  offset: number;
}

export interface DeduplicacaoFiltro {
  tipo: string;
  jogoId?: string;
  faseId?: string;
  rodada?: number;
  grupoId?: string;
  usuarioId?: string;
}

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  status: string;
  usuarioId: string;
  jogoId: string | null;
  grupoId: string | null;
  faseId: string | null;
  rodada: number | null;
  dataCriacao: Date;
  dataLeitura: Date | null;
}

export interface NotificacaoRepository {
  criar(data: CriarNotificacaoData): Promise<Notificacao>;
  criarVarios(data: CriarNotificacaoData[]): Promise<void>;
  buscarPorId(id: string): Promise<Notificacao | null>;
  listar(usuarioId: string, filtros: ListarFiltros): Promise<Notificacao[]>;
  contarPorFiltro(usuarioId: string, filtros: ListarFiltros): Promise<number>;
  contarNaoLidas(usuarioId: string): Promise<number>;
  marcarComoLida(id: string, dataLeitura: Date): Promise<void>;
  marcarTodasComoLidas(usuarioId: string, dataLeitura: Date): Promise<number>;
  existeNotificacao(filtro: DeduplicacaoFiltro): Promise<boolean>;
  removerAntigasLidas(diasLimite: number, batchSize: number): Promise<number>;
  removerAntigasNaoLidas(
    diasLimite: number,
    batchSize: number,
  ): Promise<number>;
}

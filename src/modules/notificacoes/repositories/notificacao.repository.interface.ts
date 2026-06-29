export interface CriarNotificacaoData {
  tipo: string;
  titulo: string;
  mensagem: string;
  usuarioId: string;
  jogoId?: string;
  grupoId?: string;
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

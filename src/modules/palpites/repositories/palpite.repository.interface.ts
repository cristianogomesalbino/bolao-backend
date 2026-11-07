export interface Palpite {
  readonly id: string;
  readonly usuarioId: string;
  readonly jogoId: string;
  readonly golsCasa: number;
  readonly golsFora: number;
  readonly dataCriacao: Date;
  readonly atualizadoEm: Date;
}

/** Shape do include usado em listarPorUsuario (compatível com PalpitePresenter). */
export interface PalpiteJogoRelacao {
  readonly id: string;
  readonly faseId: string;
  readonly rodada: number | null;
  readonly timeCasaId: string;
  readonly timeForaId: string;
  readonly dataHora: Date | null;
  readonly status: string;
  readonly foiAdiado: boolean;
  readonly golsCasa: number | null;
  readonly golsFora: number | null;
  readonly vencedorId: string | null;
  readonly dataCriacao: Date;
  readonly atualizadoEm: Date;
  readonly timeCasa?: {
    readonly id: string;
    readonly nome: string;
    readonly sigla: string;
    readonly escudo: string | null;
  } | null;
  readonly timeFora?: {
    readonly id: string;
    readonly nome: string;
    readonly sigla: string;
    readonly escudo: string | null;
  } | null;
  readonly fase?: { readonly temporadaId?: string; readonly tipo?: string };
}

export interface PalpiteComJogo extends Palpite {
  readonly jogo?: PalpiteJogoRelacao | null;
}

export interface CriarPalpiteData {
  readonly usuarioId: string;
  readonly jogoId: string;
  readonly golsCasa: number;
  readonly golsFora: number;
}

export interface AtualizarPalpiteData {
  readonly golsCasa: number;
  readonly golsFora: number;
}

export interface PalpiteRepository {
  criar(data: CriarPalpiteData): Promise<Palpite>;
  atualizar(id: string, data: AtualizarPalpiteData): Promise<Palpite>;
  remover(id: string): Promise<void>;
  buscarPorId(id: string): Promise<Palpite | null>;
  buscarPorUsuarioEJogo(
    usuarioId: string,
    jogoId: string,
  ): Promise<Palpite | null>;
  buscarPorUsuarioEJogos(
    usuarioId: string,
    jogoIds: string[],
  ): Promise<Palpite[]>;
  listarPorUsuario(
    usuarioId: string,
    filtros?: { temporadaId?: string },
  ): Promise<PalpiteComJogo[]>;
  listarPorJogoEUsuarios(
    jogoId: string,
    usuarioIds: string[],
  ): Promise<Palpite[]>;
  listarPorFaseEUsuario(faseId: string, usuarioId: string): Promise<Palpite[]>;
  listarPorJogosEUsuarios(
    jogoIds: string[],
    usuarioIds: string[],
  ): Promise<Palpite[]>;
}

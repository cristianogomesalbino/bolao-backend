export interface PreferenciaCampos {
  jogoProximo: boolean;
  rodadaEncerrada: boolean;
  acertoEmCheio: boolean;
  subiuPosicao: boolean;
  desceuPosicao: boolean;
  palpitesPendentes: boolean;
  jogoLiberado: boolean;
}

export interface PreferenciaNotificacao {
  id: string;
  usuarioId: string;
  jogoProximo: boolean;
  rodadaEncerrada: boolean;
  acertoEmCheio: boolean;
  subiuPosicao: boolean;
  desceuPosicao: boolean;
  palpitesPendentes: boolean;
  jogoLiberado: boolean;
}

export interface PreferenciaRepository {
  buscarPorUsuario(usuarioId: string): Promise<PreferenciaNotificacao | null>;
  criar(
    usuarioId: string,
    data?: Partial<PreferenciaCampos>,
  ): Promise<PreferenciaNotificacao>;
  atualizar(
    usuarioId: string,
    data: Partial<PreferenciaCampos>,
  ): Promise<PreferenciaNotificacao>;
  buscarPorUsuarios(usuarioIds: string[]): Promise<PreferenciaNotificacao[]>;
}

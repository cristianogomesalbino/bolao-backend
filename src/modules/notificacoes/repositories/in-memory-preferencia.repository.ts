import type {
  PreferenciaRepository,
  PreferenciaCampos,
  PreferenciaNotificacao,
} from './preferencia.repository.interface';

export class InMemoryPreferenciaRepository implements PreferenciaRepository {
  items: PreferenciaNotificacao[] = [];

  async buscarPorUsuario(
    usuarioId: string,
  ): Promise<PreferenciaNotificacao | null> {
    return this.items.find((p) => p.usuarioId === usuarioId) ?? null;
  }

  async criar(
    usuarioId: string,
    data?: Partial<PreferenciaCampos>,
  ): Promise<PreferenciaNotificacao> {
    const preferencia: PreferenciaNotificacao = {
      id: crypto.randomUUID(),
      usuarioId,
      jogoProximo: data?.jogoProximo ?? true,
      rodadaEncerrada: data?.rodadaEncerrada ?? true,
      acertoEmCheio: data?.acertoEmCheio ?? true,
      subiuPosicao: data?.subiuPosicao ?? true,
      desceuPosicao: data?.desceuPosicao ?? true,
      palpitesPendentes: data?.palpitesPendentes ?? true,
      jogoLiberado: data?.jogoLiberado ?? true,
    };
    this.items.push(preferencia);
    return preferencia;
  }

  async atualizar(
    usuarioId: string,
    data: Partial<PreferenciaCampos>,
  ): Promise<PreferenciaNotificacao> {
    let preferencia = this.items.find((p) => p.usuarioId === usuarioId);
    if (!preferencia) {
      preferencia = await this.criar(usuarioId, data);
      return preferencia;
    }
    Object.assign(preferencia, data);
    return preferencia;
  }

  async buscarPorUsuarios(
    usuarioIds: string[],
  ): Promise<PreferenciaNotificacao[]> {
    return this.items.filter((p) => usuarioIds.includes(p.usuarioId));
  }
}

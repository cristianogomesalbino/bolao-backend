import type {
  NotificacaoRepository,
  CriarNotificacaoData,
  ListarFiltros,
  DeduplicacaoFiltro,
  Notificacao,
} from './notificacao.repository.interface';

export class InMemoryNotificacaoRepository implements NotificacaoRepository {
  items: Notificacao[] = [];

  async criar(data: CriarNotificacaoData): Promise<Notificacao> {
    const notificacao: Notificacao = {
      id: crypto.randomUUID(),
      tipo: data.tipo,
      titulo: data.titulo,
      mensagem: data.mensagem,
      status: 'NAO_LIDA',
      usuarioId: data.usuarioId,
      jogoId: data.jogoId ?? null,
      grupoId: data.grupoId ?? null,
      faseId: data.faseId ?? null,
      rodada: data.rodada ?? null,
      dataCriacao: new Date(),
      dataLeitura: null,
    };
    this.items.push(notificacao);
    return notificacao;
  }

  async criarVarios(data: CriarNotificacaoData[]): Promise<void> {
    for (const item of data) {
      await this.criar(item);
    }
  }

  async buscarPorId(id: string): Promise<Notificacao | null> {
    return this.items.find((n) => n.id === id) ?? null;
  }

  async listar(
    usuarioId: string,
    filtros: ListarFiltros,
  ): Promise<Notificacao[]> {
    let resultado = this.items.filter((n) => n.usuarioId === usuarioId);
    if (filtros.status) {
      resultado = resultado.filter((n) => n.status === filtros.status);
    }
    resultado.sort(
      (a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime(),
    );
    return resultado.slice(filtros.offset, filtros.offset + filtros.limit);
  }

  async contarPorFiltro(
    usuarioId: string,
    filtros: ListarFiltros,
  ): Promise<number> {
    let resultado = this.items.filter((n) => n.usuarioId === usuarioId);
    if (filtros.status) {
      resultado = resultado.filter((n) => n.status === filtros.status);
    }
    return resultado.length;
  }

  async contarNaoLidas(usuarioId: string): Promise<number> {
    return this.items.filter(
      (n) => n.usuarioId === usuarioId && n.status === 'NAO_LIDA',
    ).length;
  }

  async marcarComoLida(id: string, dataLeitura: Date): Promise<void> {
    const notificacao = this.items.find((n) => n.id === id);
    if (notificacao) {
      notificacao.status = 'LIDA';
      notificacao.dataLeitura = dataLeitura;
    }
  }

  async marcarTodasComoLidas(
    usuarioId: string,
    dataLeitura: Date,
  ): Promise<number> {
    let count = 0;
    for (const n of this.items) {
      if (n.usuarioId === usuarioId && n.status === 'NAO_LIDA') {
        n.status = 'LIDA';
        n.dataLeitura = dataLeitura;
        count++;
      }
    }
    return count;
  }

  async existeNotificacao(filtro: DeduplicacaoFiltro): Promise<boolean> {
    return this.items.some((n) => {
      if (n.tipo !== filtro.tipo) return false;
      if (filtro.jogoId && n.jogoId !== filtro.jogoId) return false;
      if (filtro.faseId && n.faseId !== filtro.faseId) return false;
      if (filtro.rodada != null && n.rodada !== filtro.rodada) return false;
      if (filtro.grupoId && n.grupoId !== filtro.grupoId) return false;
      if (filtro.usuarioId && n.usuarioId !== filtro.usuarioId) return false;
      return true;
    });
  }

  async removerAntigasLidas(
    diasLimite: number,
    batchSize: number,
  ): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    const antes = this.items.length;
    this.items = this.items.filter(
      (n) =>
        !(
          n.status === 'LIDA' &&
          n.dataLeitura &&
          n.dataLeitura < dataLimite
        ),
    );
    return Math.min(antes - this.items.length, batchSize);
  }

  async removerAntigasNaoLidas(
    diasLimite: number,
    batchSize: number,
  ): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    const antes = this.items.length;
    this.items = this.items.filter(
      (n) => !(n.status === 'NAO_LIDA' && n.dataCriacao < dataLimite),
    );
    return Math.min(antes - this.items.length, batchSize);
  }
}

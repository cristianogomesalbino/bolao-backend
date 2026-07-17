import type {
  Jogo,
  JogoComTimes,
  JogoComRelacoes,
  JogoExternoId,
  CriarJogoData,
  AtualizarJogoData,
  JogoRepository,
} from './jogo.repository.interface';

interface JogoInternal extends Jogo {
  timeCasa?: { id: string; nome: string; sigla: string; escudo: string | null; externoId: string | null };
  timeFora?: { id: string; nome: string; sigla: string; escudo: string | null; externoId: string | null };
  fase?: { id: string; nome: string; tipo: string; ordem: number; idaVolta: boolean; temporadaId: string };
}

export class InMemoryJogoRepository implements JogoRepository {
  items: JogoInternal[] = [];

  async criar(data: CriarJogoData): Promise<Jogo> {
    const jogo: JogoInternal = {
      id: data.id ?? crypto.randomUUID(),
      faseId: data.faseId,
      timeCasaId: data.timeCasaId,
      timeForaId: data.timeForaId,
      dataHora: data.dataHora,
      rodada: data.rodada,
      status: data.status,
      golsCasa: data.golsCasa ?? null,
      golsFora: data.golsFora ?? null,
      temProrrogacao: data.temProrrogacao ?? false,
      golsProrrogacaoCasa: data.golsProrrogacaoCasa ?? null,
      golsProrrogacaoFora: data.golsProrrogacaoFora ?? null,
      temPenaltis: data.temPenaltis ?? false,
      penaltisCasa: data.penaltisCasa ?? null,
      penaltisFora: data.penaltisFora ?? null,
      vencedorId: data.vencedorId ?? null,
      ehJogoVolta: data.ehJogoVolta ?? false,
      grupoIdaVolta: data.grupoIdaVolta ?? null,
      fonteResultado: data.fonteResultado ?? 'MANUAL',
      foiAdiado: data.foiAdiado ?? false,
      externoId: data.externoId ?? null,
      criadoPor: data.criadoPor,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(jogo);
    return jogo;
  }

  async atualizar(id: string, data: AtualizarJogoData): Promise<Jogo> {
    const index = this.items.findIndex((j) => j.id === id);
    if (index === -1) return null as unknown as Jogo;
    this.items[index] = {
      ...this.items[index],
      ...data,
      atualizadoEm: new Date(),
    };
    return this.items[index];
  }

  async buscarPorId(id: string): Promise<JogoComRelacoes | null> {
    return (this.items.find((j) => j.id === id) as JogoComRelacoes) ?? null;
  }

  async buscarPorIds(ids: string[]): Promise<Jogo[]> {
    return this.items.filter((j) => ids.includes(j.id));
  }

  async buscarPorExternoIds(externoIds: string[]): Promise<JogoExternoId[]> {
    return this.items
      .filter((j) => j.externoId && externoIds.includes(j.externoId))
      .map((j) => ({ externoId: j.externoId }));
  }

  async buscarPorFase(faseId: string, rodada?: number): Promise<JogoComTimes[]> {
    return this.items
      .filter(
        (j) =>
          j.faseId === faseId && (rodada === undefined || j.rodada === rodada),
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() - new Date(b.dataHora ?? 0).getTime(),
      ) as JogoComTimes[];
  }

  async buscarPorFaseAteRodada(faseId: string, ateRodada: number): Promise<JogoComTimes[]> {
    return this.items
      .filter(
        (j) =>
          j.faseId === faseId && j.rodada !== null && j.rodada <= ateRodada,
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() - new Date(b.dataHora ?? 0).getTime(),
      ) as JogoComTimes[];
  }

  async buscarPorFaseEStatus(faseId: string, status: string): Promise<JogoComTimes[]> {
    return this.items
      .filter((j) => j.faseId === faseId && j.status === status)
      .sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0)) as JogoComTimes[];
  }

  async buscarPorExternoId(externoId: string): Promise<Jogo | null> {
    return this.items.find((j) => j.externoId === externoId) ?? null;
  }

  async buscarPorGrupoIdaVolta(grupoIdaVolta: string): Promise<Jogo[]> {
    return this.items.filter((j) => j.grupoIdaVolta === grupoIdaVolta);
  }

  async buscarProximoJogoPorTemporada(temporadaId: string): Promise<JogoComRelacoes | null> {
    const agora = Date.now();

    const emAndamento = this.items
      .filter(
        (j) =>
          j.fase?.temporadaId === temporadaId && j.status === 'EM_ANDAMENTO',
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() - new Date(b.dataHora ?? 0).getTime(),
      );

    if (emAndamento.length > 0) return emAndamento[0] as JogoComRelacoes;

    const candidatos = this.items
      .filter(
        (j) =>
          j.fase?.temporadaId === temporadaId &&
          j.status === 'AGENDADO' &&
          j.dataHora &&
          new Date(j.dataHora).getTime() > agora,
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() - new Date(b.dataHora ?? 0).getTime(),
      );
    return (candidatos[0] as JogoComRelacoes) ?? null;
  }

  async buscarProximosJogosPorTemporada(temporadaId: string): Promise<JogoComRelacoes[]> {
    const emAndamento = this.items
      .filter(
        (j) =>
          j.fase?.temporadaId === temporadaId && j.status === 'EM_ANDAMENTO',
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() - new Date(b.dataHora ?? 0).getTime(),
      );

    if (emAndamento.length > 0) return emAndamento as JogoComRelacoes[];

    const agora = Date.now();
    const candidatos = this.items
      .filter(
        (j) =>
          j.fase?.temporadaId === temporadaId &&
          j.status === 'AGENDADO' &&
          j.dataHora &&
          new Date(j.dataHora).getTime() > agora,
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() - new Date(b.dataHora ?? 0).getTime(),
      );

    if (candidatos.length === 0) return [];

    const primeiroHorario = new Date(candidatos[0].dataHora!).getTime();
    return candidatos.filter(
      (j) => new Date(j.dataHora!).getTime() === primeiroHorario,
    ) as JogoComRelacoes[];
  }

  async contarAdiadosPorTemporada(temporadaId: string): Promise<number> {
    return this.items.filter(
      (j) => j.fase?.temporadaId === temporadaId && j.status === 'ADIADO',
    ).length;
  }

  async buscarTodosPorTemporada(temporadaId: string): Promise<JogoComRelacoes[]> {
    return this.items.filter(
      (j) => j.fase?.temporadaId === temporadaId,
    ) as JogoComRelacoes[];
  }

  async buscarRodadaAtual(faseId: string): Promise<number | null> {
    const naoFinalizados = this.items
      .filter(
        (j) =>
          j.faseId === faseId &&
          !['FINALIZADO', 'ADIADO', 'CANCELADO'].includes(j.status) &&
          j.rodada != null &&
          j.dataHora != null,
      )
      .sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0));

    if (naoFinalizados.length > 0) return naoFinalizados[0].rodada;

    const todos = this.items
      .filter((j) => j.faseId === faseId && j.rodada != null)
      .sort((a, b) => (b.rodada ?? 0) - (a.rodada ?? 0));

    return todos.length > 0 ? todos[0].rodada : null;
  }

  async buscarPendentesSync(faseIds: string[], limiteRodada: number): Promise<JogoComTimes[]> {
    const agora = new Date();
    return this.items.filter(
      (j) =>
        faseIds.includes(j.faseId) &&
        j.fonteResultado === 'API_EXTERNA' &&
        j.status !== 'FINALIZADO' &&
        j.status !== 'CANCELADO' &&
        (j.rodada == null ||
          j.rodada <= limiteRodada ||
          (j.dataHora != null && new Date(j.dataHora) <= agora)),
    ) as JogoComTimes[];
  }

  async buscarJogosComTimePlaceholder(
    _temporadaId: string,
    placeholderTimeId: string,
  ): Promise<JogoComRelacoes[]> {
    return this.items.filter(
      (j) =>
        j.timeCasaId === placeholderTimeId ||
        j.timeForaId === placeholderTimeId,
    ) as JogoComRelacoes[];
  }

  async buscarAgendadosEntre(inicio: Date, fim: Date): Promise<JogoComRelacoes[]> {
    const inicioMs = inicio.getTime();
    const fimMs = fim.getTime();
    return this.items
      .filter(
        (j) =>
          j.status === 'AGENDADO' &&
          j.dataHora &&
          new Date(j.dataHora).getTime() >= inicioMs &&
          new Date(j.dataHora).getTime() <= fimMs,
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() - new Date(b.dataHora ?? 0).getTime(),
      ) as JogoComRelacoes[];
  }

  async contarAtrasados(): Promise<number> {
    const agora = new Date();
    return this.items.filter(
      (j) =>
        j.status === 'AGENDADO' &&
        j.fonteResultado === 'API_EXTERNA' &&
        j.dataHora != null &&
        new Date(j.dataHora) <= agora,
    ).length;
  }

  async contarEmAndamento(): Promise<number> {
    return this.items.filter(
      (j) =>
        j.status === 'EM_ANDAMENTO' && j.fonteResultado === 'API_EXTERNA',
    ).length;
  }

  async buscarProximoAgendado(): Promise<{
    dataHora: Date | null;
    timeCasa?: { sigla: string } | null;
    timeFora?: { sigla: string } | null;
  } | null> {
    const agora = new Date();
    const proximo = this.items
      .filter(
        (j) =>
          j.status === 'AGENDADO' &&
          j.fonteResultado === 'API_EXTERNA' &&
          j.dataHora != null &&
          new Date(j.dataHora) > agora,
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() -
          new Date(b.dataHora ?? 0).getTime(),
      )[0];

    if (!proximo) return null;
    return {
      dataHora: proximo.dataHora ? new Date(proximo.dataHora) : null,
      timeCasa: proximo.timeCasa
        ? { sigla: proximo.timeCasa.sigla }
        : null,
      timeFora: proximo.timeFora
        ? { sigla: proximo.timeFora.sigla }
        : null,
    };
  }
}

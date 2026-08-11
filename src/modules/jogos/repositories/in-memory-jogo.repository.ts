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
  timeCasa?: {
    id: string;
    nome: string;
    sigla: string;
    escudo: string | null;
    externoId: string | null;
  };
  timeFora?: {
    id: string;
    nome: string;
    sigla: string;
    escudo: string | null;
    externoId: string | null;
  };
  fase?: {
    id: string;
    nome: string;
    tipo: string;
    ordem: number;
    idaVolta: boolean;
    temporadaId: string;
  };
}

export class InMemoryJogoRepository implements JogoRepository {
  items: JogoInternal[] = [];

  criar(data: CriarJogoData): Promise<Jogo> {
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
    return Promise.resolve(jogo);
  }

  atualizar(id: string, data: AtualizarJogoData): Promise<Jogo> {
    const index = this.items.findIndex((j) => j.id === id);
    if (index === -1) return Promise.resolve(null as unknown as Jogo);
    this.items[index] = {
      ...this.items[index],
      ...data,
      atualizadoEm: new Date(),
    };
    return Promise.resolve(this.items[index]);
  }

  buscarPorId(id: string): Promise<JogoComRelacoes | null> {
    return Promise.resolve(
      (this.items.find((j) => j.id === id) as JogoComRelacoes) ?? null,
    );
  }

  buscarPorIds(ids: string[]): Promise<Jogo[]> {
    return Promise.resolve(this.items.filter((j) => ids.includes(j.id)));
  }

  buscarPorExternoIds(externoIds: string[]): Promise<JogoExternoId[]> {
    return Promise.resolve(
      this.items
        .filter((j) => j.externoId && externoIds.includes(j.externoId))
        .map((j) => ({ externoId: j.externoId })),
    );
  }

  buscarPorFase(faseId: string, rodada?: number): Promise<JogoComTimes[]> {
    return Promise.resolve(
      this.items
        .filter(
          (j) =>
            j.faseId === faseId &&
            (rodada === undefined || j.rodada === rodada),
        )
        .sort(
          (a, b) =>
            new Date(a.dataHora ?? 0).getTime() -
            new Date(b.dataHora ?? 0).getTime(),
        ) as JogoComTimes[],
    );
  }

  buscarPorFaseAteRodada(
    faseId: string,
    ateRodada: number,
  ): Promise<JogoComTimes[]> {
    return Promise.resolve(
      this.items
        .filter(
          (j) =>
            j.faseId === faseId && j.rodada !== null && j.rodada <= ateRodada,
        )
        .sort(
          (a, b) =>
            new Date(a.dataHora ?? 0).getTime() -
            new Date(b.dataHora ?? 0).getTime(),
        ) as JogoComTimes[],
    );
  }

  buscarPorFaseEStatus(
    faseId: string,
    status: string,
  ): Promise<JogoComTimes[]> {
    return Promise.resolve(
      this.items
        .filter((j) => j.faseId === faseId && j.status === status)
        .sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0)) as JogoComTimes[],
    );
  }

  buscarPorExternoId(externoId: string): Promise<Jogo | null> {
    return Promise.resolve(
      this.items.find((j) => j.externoId === externoId) ?? null,
    );
  }

  buscarPorGrupoIdaVolta(grupoIdaVolta: string): Promise<Jogo[]> {
    return Promise.resolve(
      this.items.filter((j) => j.grupoIdaVolta === grupoIdaVolta),
    );
  }

  buscarProximoJogoPorTemporada(
    temporadaId: string,
  ): Promise<JogoComRelacoes | null> {
    const agora = Date.now();

    const emAndamento = this.items
      .filter(
        (j) =>
          j.fase?.temporadaId === temporadaId && j.status === 'EM_ANDAMENTO',
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() -
          new Date(b.dataHora ?? 0).getTime(),
      );

    if (emAndamento.length > 0)
      return Promise.resolve(emAndamento[0] as JogoComRelacoes);

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
          new Date(a.dataHora ?? 0).getTime() -
          new Date(b.dataHora ?? 0).getTime(),
      );
    return Promise.resolve((candidatos[0] as JogoComRelacoes) ?? null);
  }

  buscarProximosJogosPorTemporada(
    temporadaId: string,
  ): Promise<JogoComRelacoes[]> {
    const emAndamento = this.items
      .filter(
        (j) =>
          j.fase?.temporadaId === temporadaId && j.status === 'EM_ANDAMENTO',
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora ?? 0).getTime() -
          new Date(b.dataHora ?? 0).getTime(),
      );

    if (emAndamento.length > 0)
      return Promise.resolve(emAndamento as JogoComRelacoes[]);

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
          new Date(a.dataHora ?? 0).getTime() -
          new Date(b.dataHora ?? 0).getTime(),
      );

    if (candidatos.length === 0) return Promise.resolve([]);

    const primeiroHorario = new Date(candidatos[0].dataHora!).getTime();
    return Promise.resolve(
      candidatos.filter(
        (j) => new Date(j.dataHora!).getTime() === primeiroHorario,
      ) as JogoComRelacoes[],
    );
  }

  contarAdiadosPorTemporada(temporadaId: string): Promise<number> {
    const jogosTemporada = this.items.filter(
      (j) => j.fase?.temporadaId === temporadaId,
    );
    const rodadaAtual = jogosTemporada
      .filter(
        (j) =>
          j.status !== 'FINALIZADO' &&
          j.status !== 'CANCELADO' &&
          j.status !== 'ADIADO',
      )
      .reduce(
        (min, j) => (j.rodada && j.rodada < min ? j.rodada : min),
        Infinity,
      );

    if (rodadaAtual === Infinity) {
      return Promise.resolve(
        jogosTemporada.filter((j) => j.status === 'ADIADO').length,
      );
    }

    return Promise.resolve(
      jogosTemporada.filter(
        (j) =>
          j.status === 'ADIADO' && j.rodada !== null && j.rodada < rodadaAtual,
      ).length,
    );
  }

  buscarTodosPorTemporada(temporadaId: string): Promise<JogoComRelacoes[]> {
    return Promise.resolve(
      this.items.filter(
        (j) => j.fase?.temporadaId === temporadaId,
      ) as JogoComRelacoes[],
    );
  }

  buscarRodadaAtual(faseId: string): Promise<number | null> {
    const naoFinalizados = this.items
      .filter(
        (j) =>
          j.faseId === faseId &&
          !['FINALIZADO', 'ADIADO', 'CANCELADO'].includes(j.status) &&
          j.rodada != null &&
          j.dataHora != null,
      )
      .sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0));

    if (naoFinalizados.length > 0)
      return Promise.resolve(naoFinalizados[0].rodada);

    const todos = this.items
      .filter((j) => j.faseId === faseId && j.rodada != null)
      .sort((a, b) => (b.rodada ?? 0) - (a.rodada ?? 0));

    return Promise.resolve(todos.length > 0 ? todos[0].rodada : null);
  }

  buscarPendentesSync(
    faseIds: string[],
    limiteRodada: number,
  ): Promise<JogoComTimes[]> {
    const agora = new Date();
    return Promise.resolve(
      this.items.filter(
        (j) =>
          faseIds.includes(j.faseId) &&
          j.fonteResultado === 'API_EXTERNA' &&
          j.status !== 'FINALIZADO' &&
          j.status !== 'CANCELADO' &&
          (j.rodada == null ||
            j.rodada <= limiteRodada ||
            (j.dataHora != null && new Date(j.dataHora) <= agora)),
      ) as JogoComTimes[],
    );
  }

  buscarJogosComTimePlaceholder(
    _temporadaId: string,
    placeholderTimeId: string,
  ): Promise<JogoComRelacoes[]> {
    return Promise.resolve(
      this.items.filter(
        (j) =>
          j.timeCasaId === placeholderTimeId ||
          j.timeForaId === placeholderTimeId,
      ) as JogoComRelacoes[],
    );
  }

  buscarAgendadosEntre(inicio: Date, fim: Date): Promise<JogoComRelacoes[]> {
    const inicioMs = inicio.getTime();
    const fimMs = fim.getTime();
    return Promise.resolve(
      this.items
        .filter(
          (j) =>
            j.status === 'AGENDADO' &&
            j.dataHora &&
            new Date(j.dataHora).getTime() >= inicioMs &&
            new Date(j.dataHora).getTime() <= fimMs,
        )
        .sort(
          (a, b) =>
            new Date(a.dataHora ?? 0).getTime() -
            new Date(b.dataHora ?? 0).getTime(),
        ) as JogoComRelacoes[],
    );
  }

  contarAtrasados(): Promise<number> {
    const agora = new Date();
    return Promise.resolve(
      this.items.filter(
        (j) =>
          j.status === 'AGENDADO' &&
          j.fonteResultado === 'API_EXTERNA' &&
          j.dataHora != null &&
          new Date(j.dataHora) <= agora,
      ).length,
    );
  }

  contarEmAndamento(): Promise<number> {
    return Promise.resolve(
      this.items.filter(
        (j) =>
          j.status === 'EM_ANDAMENTO' && j.fonteResultado === 'API_EXTERNA',
      ).length,
    );
  }

  buscarProximoAgendado(): Promise<{
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

    if (!proximo) return Promise.resolve(null);
    return Promise.resolve({
      dataHora: proximo.dataHora ? new Date(proximo.dataHora) : null,
      timeCasa: proximo.timeCasa ? { sigla: proximo.timeCasa.sigla } : null,
      timeFora: proximo.timeFora ? { sigla: proximo.timeFora.sigla } : null,
    });
  }
}

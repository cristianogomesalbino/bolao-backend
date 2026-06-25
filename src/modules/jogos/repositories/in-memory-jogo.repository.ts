import { JogoRepository } from './jogo.repository.interface';

export class InMemoryJogoRepository implements JogoRepository {
  items: any[] = [];

  async criar(data: any) {
    const jogo = {
      id: crypto.randomUUID(),
      ...data,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(jogo);
    return jogo;
  }

  async atualizar(id: string, data: any) {
    const index = this.items.findIndex((j) => j.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...data, atualizadoEm: new Date() };
    return this.items[index];
  }

  async buscarPorId(id: string) {
    return this.items.find((j) => j.id === id) ?? null;
  }

  async buscarPorIds(ids: string[]) {
    return this.items.filter((j) => ids.includes(j.id));
  }

  async buscarPorExternoIds(externoIds: string[]) {
    return this.items.filter((j) => j.externoId && externoIds.includes(j.externoId));
  }

  async buscarPorFase(faseId: string, rodada?: number) {
    return this.items
      .filter((j) => j.faseId === faseId && (rodada === undefined || j.rodada === rodada))
      .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
  }

  async buscarPorFaseAteRodada(faseId: string, ateRodada: number) {
    return this.items
      .filter((j) => j.faseId === faseId && j.rodada !== null && j.rodada <= ateRodada)
      .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
  }

  async buscarPorFaseEStatus(faseId: string, status: string) {
    return this.items
      .filter((j) => j.faseId === faseId && j.status === status)
      .sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0));
  }

  async buscarPorExternoId(externoId: string) {
    return this.items.find((j) => j.externoId === externoId) ?? null;
  }

  async buscarPorGrupoIdaVolta(grupoIdaVolta: string) {
    return this.items.filter((j) => j.grupoIdaVolta === grupoIdaVolta);
  }

  async buscarProximoJogoPorTemporada(temporadaId: string) {
    const agora = Date.now();

    // Prioridade 1: jogos em andamento
    const emAndamento = this.items
      .filter(
        (j) =>
          j.fase?.temporadaId === temporadaId &&
          j.status === 'EM_ANDAMENTO',
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
      );

    if (emAndamento.length > 0) return emAndamento[0];

    // Prioridade 2: próximo agendado
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
          new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
      );
    return candidatos[0] ?? null;
  }

  async buscarProximosJogosPorTemporada(temporadaId: string) {
    // Prioridade 1: jogos em andamento agora
    const emAndamento = this.items
      .filter(
        (j) =>
          j.fase?.temporadaId === temporadaId &&
          j.status === 'EM_ANDAMENTO',
      )
      .sort(
        (a, b) =>
          new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
      );

    if (emAndamento.length > 0) return emAndamento;

    // Prioridade 2: próximos jogos agendados (mesmo horário)
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
          new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
      );

    if (candidatos.length === 0) return [];

    const primeiroHorario = new Date(candidatos[0].dataHora).getTime();
    return candidatos.filter(
      (j) => new Date(j.dataHora).getTime() === primeiroHorario,
    );
  }

  async contarAdiadosPorTemporada(temporadaId: string) {
    return this.items.filter(
      (j) => j.fase?.temporadaId === temporadaId && j.status === 'ADIADO',
    ).length;
  }

  async buscarTodosPorTemporada(temporadaId: string) {
    return this.items.filter((j) => j.fase?.temporadaId === temporadaId);
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
      .sort((a, b) => a.rodada - b.rodada);

    if (naoFinalizados.length > 0) return naoFinalizados[0].rodada;

    const todos = this.items
      .filter((j) => j.faseId === faseId && j.rodada != null)
      .sort((a, b) => b.rodada - a.rodada);

    return todos.length > 0 ? todos[0].rodada : null;
  }

  async buscarPendentesSync(faseIds: string[], limiteRodada: number) {
    return this.items.filter(
      (j) =>
        faseIds.includes(j.faseId) &&
        j.externoId != null &&
        j.fonteResultado === 'API_EXTERNA' &&
        j.status !== 'FINALIZADO' &&
        j.status !== 'CANCELADO' &&
        (j.rodada == null || j.rodada <= limiteRodada),
    );
  }
}

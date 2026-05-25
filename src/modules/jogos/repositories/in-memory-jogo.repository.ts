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

  async buscarRodadaAtual(faseId: string): Promise<number | null> {
    const naoFinalizados = this.items
      .filter((j) => j.faseId === faseId && j.status !== 'FINALIZADO' && j.rodada != null)
      .sort((a, b) => a.rodada - b.rodada);

    if (naoFinalizados.length > 0) return naoFinalizados[0].rodada;

    const todos = this.items
      .filter((j) => j.faseId === faseId && j.rodada != null)
      .sort((a, b) => b.rodada - a.rodada);

    return todos.length > 0 ? todos[0].rodada : null;
  }
}

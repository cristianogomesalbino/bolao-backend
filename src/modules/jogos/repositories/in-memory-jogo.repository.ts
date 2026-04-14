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

  async buscarPorFase(faseId: string) {
    return this.items
      .filter((j) => j.faseId === faseId)
      .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
  }

  async buscarPorExternoId(externoId: string) {
    return this.items.find((j) => j.externoId === externoId) ?? null;
  }

  async buscarPorGrupoIdaVolta(grupoIdaVolta: string) {
    return this.items.filter((j) => j.grupoIdaVolta === grupoIdaVolta);
  }
}

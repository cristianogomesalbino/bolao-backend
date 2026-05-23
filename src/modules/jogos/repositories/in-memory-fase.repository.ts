import { FaseRepository } from './fase.repository.interface';

export class InMemoryFaseRepository implements FaseRepository {
  items: any[] = [];

  async criar(data: any) {
    const fase = {
      id: crypto.randomUUID(),
      ...data,
      dataCriacao: new Date(),
    };
    this.items.push(fase);
    return fase;
  }

  async criarVarios(data: any[]) {
    const fases = data.map((d) => ({
      id: crypto.randomUUID(),
      ...d,
      dataCriacao: new Date(),
    }));
    this.items.push(...fases);
    return fases;
  }

  async buscarPorId(id: string) {
    return this.items.find((f) => f.id === id) ?? null;
  }

  async buscarPorTemporada(temporadaId: string) {
    return this.items
      .filter((f) => f.temporadaId === temporadaId)
      .sort((a, b) => a.ordem - b.ordem);
  }
}

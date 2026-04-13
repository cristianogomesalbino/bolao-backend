import { TemporadaRepository } from './temporada.repository.interface';

export class InMemoryTemporadaRepository implements TemporadaRepository {
  items: any[] = [];
  campeonatos: any[] = [];

  async criar(data: { ano: number; campeonatoId: string }) {
    const temporada = {
      id: crypto.randomUUID(),
      ano: data.ano,
      campeonatoId: data.campeonatoId,
      dataCriacao: new Date(),
    };
    this.items.push(temporada);
    return temporada;
  }

  async buscarTodos() {
    return this.items.map((t) => ({
      ...t,
      campeonato: this.campeonatos.find((c) => c.id === t.campeonatoId) ?? null,
    }));
  }

  async buscarPorId(id: string) {
    return this.items.find((t) => t.id === id) ?? null;
  }
}

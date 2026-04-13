import { CampeonatoRepository } from './campeonato.repository.interface';

export class InMemoryCampeonatoRepository implements CampeonatoRepository {
  items: any[] = [];

  async criar(data: { nome: string }) {
    const campeonato = {
      id: crypto.randomUUID(),
      nome: data.nome,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(campeonato);
    return campeonato;
  }

  async buscarTodos() {
    return this.items;
  }

  async buscarPorId(id: string) {
    return this.items.find((c) => c.id === id) ?? null;
  }
}

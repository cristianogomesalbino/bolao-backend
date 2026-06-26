import { TimeRepository } from './time.repository.interface';

export class InMemoryTimeRepository implements TimeRepository {
  items: any[] = [];

  async criar(data: any) {
    const time = {
      id: crypto.randomUUID(),
      ...data,
      dataCriacao: new Date(),
    };
    this.items.push(time);
    return time;
  }

  async atualizar(
    id: string,
    data: Partial<{ nome: string; sigla: string; escudo: string }>,
  ) {
    const index = this.items.findIndex((t) => t.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...data };
    return this.items[index];
  }

  async buscarPorExternoId(externoId: string) {
    return this.items.find((t) => t.externoId === externoId) ?? null;
  }

  async buscarPorId(id: string) {
    return this.items.find((t) => t.id === id) ?? null;
  }

  async buscarPorSigla(sigla: string) {
    return this.items.find((t) => t.sigla === sigla) ?? null;
  }

  async buscarTodos() {
    return [...this.items].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async buscarPorExternoIds(externoIds: string[]) {
    return this.items.filter(
      (t) => t.externoId && externoIds.includes(t.externoId),
    );
  }
}

import { PalpiteRepository } from './palpite.repository.interface';

export class InMemoryPalpiteRepository implements PalpiteRepository {
  items: any[] = [];

  async criar(data: { usuarioId: string; jogoId: string; golsCasa: number; golsFora: number }) {
    const palpite = {
      id: crypto.randomUUID(),
      ...data,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(palpite);
    return palpite;
  }

  async atualizar(id: string, data: { golsCasa: number; golsFora: number }) {
    const index = this.items.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...data, atualizadoEm: new Date() };
    return this.items[index];
  }

  async remover(id: string) {
    this.items = this.items.filter((p) => p.id !== id);
  }

  async buscarPorId(id: string) {
    return this.items.find((p) => p.id === id) ?? null;
  }

  async buscarPorUsuarioEJogo(usuarioId: string, jogoId: string) {
    return this.items.find((p) => p.usuarioId === usuarioId && p.jogoId === jogoId) ?? null;
  }

  async listarPorUsuario(usuarioId: string, filtros?: { temporadaId?: string }) {
    return this.items.filter((p) => p.usuarioId === usuarioId);
  }

  async listarPorJogoEUsuarios(jogoId: string, usuarioIds: string[]) {
    return this.items.filter((p) => p.jogoId === jogoId && usuarioIds.includes(p.usuarioId));
  }

  async listarPorFaseEUsuario(faseId: string, usuarioId: string) {
    return this.items.filter((p) => p.usuarioId === usuarioId && p.jogo?.faseId === faseId);
  }
}

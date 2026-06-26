import { PalpiteDobradoRepository } from './palpite-dobrado.repository.interface';

export class InMemoryPalpiteDobradoRepository implements PalpiteDobradoRepository {
  items: any[] = [];

  async criar(data: { usuarioId: string; jogoId: string; grupoId: string }) {
    const palpiteDobrado = {
      id: crypto.randomUUID(),
      ...data,
      dataCriacao: new Date(),
    };
    this.items.push(palpiteDobrado);
    return palpiteDobrado;
  }

  async remover(usuarioId: string, jogoId: string, grupoId: string) {
    this.items = this.items.filter(
      (p) =>
        !(
          p.usuarioId === usuarioId &&
          p.jogoId === jogoId &&
          p.grupoId === grupoId
        ),
    );
  }

  async buscarPorChave(usuarioId: string, jogoId: string, grupoId: string) {
    return (
      this.items.find(
        (p) =>
          p.usuarioId === usuarioId &&
          p.jogoId === jogoId &&
          p.grupoId === grupoId,
      ) ?? null
    );
  }

  async listarPorJogoEGrupo(jogoId: string, grupoId: string) {
    return this.items.filter(
      (p) => p.jogoId === jogoId && p.grupoId === grupoId,
    );
  }

  async listarPorJogosEGrupo(jogoIds: string[], grupoId: string) {
    return this.items.filter(
      (p) => jogoIds.includes(p.jogoId) && p.grupoId === grupoId,
    );
  }

  async listarPorUsuarioEGrupo(usuarioId: string, grupoId: string) {
    return this.items.filter(
      (p) => p.usuarioId === usuarioId && p.grupoId === grupoId,
    );
  }
}

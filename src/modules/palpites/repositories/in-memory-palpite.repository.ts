import type {
  AtualizarPalpiteData,
  CriarPalpiteData,
  Palpite,
  PalpiteComJogo,
  PalpiteRepository,
} from './palpite.repository.interface';

export class InMemoryPalpiteRepository implements PalpiteRepository {
  items: PalpiteComJogo[] = [];

  async criar(data: CriarPalpiteData): Promise<Palpite> {
    const palpite: Palpite = {
      id: crypto.randomUUID(),
      ...data,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(palpite);
    return palpite;
  }

  async atualizar(id: string, data: AtualizarPalpiteData): Promise<Palpite> {
    const index = this.items.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Palpite ${id} não encontrado`);
    }
    this.items[index] = {
      ...this.items[index],
      ...data,
      atualizadoEm: new Date(),
    };
    return this.items[index];
  }

  async remover(id: string) {
    this.items = this.items.filter((p) => p.id !== id);
  }

  async buscarPorId(id: string) {
    return this.items.find((p) => p.id === id) ?? null;
  }

  async buscarPorUsuarioEJogo(usuarioId: string, jogoId: string) {
    return (
      this.items.find(
        (p) => p.usuarioId === usuarioId && p.jogoId === jogoId,
      ) ?? null
    );
  }

  async buscarPorUsuarioEJogos(usuarioId: string, jogoIds: string[]) {
    return this.items.filter(
      (p) => p.usuarioId === usuarioId && jogoIds.includes(p.jogoId),
    );
  }

  async listarPorUsuario(
    usuarioId: string,
    filtros?: { temporadaId?: string },
  ) {
    let resultado = this.items.filter((p) => p.usuarioId === usuarioId);
    if (filtros?.temporadaId) {
      resultado = resultado.filter(
        (p) => p.jogo?.fase?.temporadaId === filtros.temporadaId,
      );
    }
    return resultado;
  }

  async listarPorJogoEUsuarios(jogoId: string, usuarioIds: string[]) {
    return this.items.filter(
      (p) => p.jogoId === jogoId && usuarioIds.includes(p.usuarioId),
    );
  }

  async listarPorFaseEUsuario(faseId: string, usuarioId: string) {
    return this.items.filter(
      (p) => p.usuarioId === usuarioId && p.jogo?.faseId === faseId,
    );
  }

  async listarPorJogosEUsuarios(jogoIds: string[], usuarioIds: string[]) {
    return this.items.filter(
      (p) => jogoIds.includes(p.jogoId) && usuarioIds.includes(p.usuarioId),
    );
  }
}

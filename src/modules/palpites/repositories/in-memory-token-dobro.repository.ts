import { TokenDobroRepository } from './token-dobro.repository.interface';

export class InMemoryTokenDobroRepository implements TokenDobroRepository {
  items: any[] = [];

  async criar(data: {
    usuarioId: string;
    grupoId: string;
    tipo: 'CONCESSAO' | 'UTILIZACAO';
    motivo: string;
    referenciaId: string;
  }) {
    const token = {
      id: crypto.randomUUID(),
      ...data,
      dataCriacao: new Date(),
    };
    this.items.push(token);
    return token;
  }

  async calcularSaldo(usuarioId: string, grupoId: string): Promise<number> {
    const tokens = this.items.filter(
      (t) => t.usuarioId === usuarioId && t.grupoId === grupoId,
    );
    const concessoes = tokens.filter((t) => t.tipo === 'CONCESSAO').length;
    const utilizacoes = tokens.filter((t) => t.tipo === 'UTILIZACAO').length;
    return concessoes - utilizacoes;
  }

  async listarPorUsuarioEGrupo(usuarioId: string, grupoId: string) {
    return this.items
      .filter((t) => t.usuarioId === usuarioId && t.grupoId === grupoId)
      .sort((a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime());
  }

  async buscarPorChave(
    usuarioId: string,
    grupoId: string,
    motivo: string,
    referenciaId: string,
  ) {
    return (
      this.items.find(
        (t) =>
          t.usuarioId === usuarioId &&
          t.grupoId === grupoId &&
          t.motivo === motivo &&
          t.referenciaId === referenciaId,
      ) ?? null
    );
  }
}

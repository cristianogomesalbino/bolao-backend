import { GrupoRepository } from './grupo.repository.interface';

export class InMemoryGrupoRepository implements GrupoRepository {
  items: any[] = [];
  temporadas: any[] = [];

  async criar(data: {
    nome: string;
    temporadaId: string;
    privado: boolean;
    codigoConvite: string | null;
    permitirPalpiteAutomatico: boolean;
    maxParticipantes: number;
    createdById: string;
  }) {
    const grupo = {
      id: crypto.randomUUID(),
      nome: data.nome,
      temporadaId: data.temporadaId,
      privado: data.privado,
      codigoConvite: data.codigoConvite,
      permitirPalpiteAutomatico: data.permitirPalpiteAutomatico,
      maxParticipantes: data.maxParticipantes,
      createdById: data.createdById,
      ativo: true,
      dataCriacao: new Date(),
    };
    this.items.push(grupo);
    return this.comTemporada(grupo);
  }

  async buscarTodos(filtros: { ativo: boolean }) {
    return this.items
      .filter((g) => g.ativo === filtros.ativo)
      .map((g) => this.comTemporada(g));
  }

  async buscarPorId(id: string) {
    const grupo = this.items.find((g) => g.id === id);
    if (!grupo) return null;
    return this.comTemporada(grupo);
  }

  async buscarPorIdSimples(id: string) {
    return this.items.find((g) => g.id === id) ?? null;
  }

  async buscarPorCodigoConvite(codigo: string) {
    return this.items.find((g) => g.codigoConvite === codigo) ?? null;
  }

  async atualizar(id: string, data: Partial<{ nome: string; privado: boolean; permitirPalpiteAutomatico: boolean; ativo: boolean }>) {
    const index = this.items.findIndex((g) => g.id === id);
    if (index === -1) return null;
    this.items[index] = { ...this.items[index], ...data };
    return this.items[index];
  }

  async remover(id: string) {
    const index = this.items.findIndex((g) => g.id === id);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  async buscarPorTemporadaId(temporadaId: string) {
    return this.items.filter((g) => g.temporadaId === temporadaId);
  }

  private comTemporada(grupo: any) {
    const temporada = this.temporadas.find((t) => t.id === grupo.temporadaId);
    return {
      ...grupo,
      temporada: temporada ? { ...temporada } : null,
    };
  }
}

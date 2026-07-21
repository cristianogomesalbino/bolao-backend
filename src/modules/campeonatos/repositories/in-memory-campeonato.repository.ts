import type {
  CampeonatoRepository,
  Campeonato,
  StatusCampeonato,
} from './campeonato.repository.interface';

export class InMemoryCampeonatoRepository implements CampeonatoRepository {
  items: Campeonato[] = [];

  async criar(data: { nome: string }): Promise<Campeonato> {
    const campeonato: Campeonato = {
      id: crypto.randomUUID(),
      nome: data.nome,
      status: 'NAO_INICIADO',
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(campeonato);
    return campeonato;
  }

  async buscarTodos(): Promise<Campeonato[]> {
    return this.items;
  }

  async buscarPorId(id: string): Promise<Campeonato | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }

  async atualizarStatus(
    id: string,
    status: StatusCampeonato,
  ): Promise<Campeonato> {
    const campeonato = this.items.find((c) => c.id === id);
    if (!campeonato) throw new Error('Campeonato não encontrado');
    campeonato.status = status;
    campeonato.atualizadoEm = new Date();
    return campeonato;
  }
}

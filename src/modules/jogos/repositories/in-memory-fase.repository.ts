import type {
  Fase,
  FaseComTemporada,
  CriarFaseData,
  FaseRepository,
} from './fase.repository.interface';

export class InMemoryFaseRepository implements FaseRepository {
  items: Fase[] = [];

  async criar(data: CriarFaseData): Promise<Fase> {
    const fase: Fase = {
      id: crypto.randomUUID(),
      nome: data.nome,
      tipo: data.tipo,
      ordem: data.ordem,
      idaVolta: data.idaVolta ?? false,
      temporadaId: data.temporadaId,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(fase);
    return fase;
  }

  async criarVarios(data: CriarFaseData[]): Promise<Fase[]> {
    const fases = data.map(
      (d): Fase => ({
        id: crypto.randomUUID(),
        nome: d.nome,
        tipo: d.tipo,
        ordem: d.ordem,
        idaVolta: d.idaVolta ?? false,
        temporadaId: d.temporadaId,
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
      }),
    );
    this.items.push(...fases);
    return fases;
  }

  async buscarPorId(id: string): Promise<FaseComTemporada | null> {
    const fase = this.items.find((f) => f.id === id);
    return (fase as FaseComTemporada) ?? null;
  }

  async buscarPorTemporada(temporadaId: string): Promise<Fase[]> {
    return this.items
      .filter((f) => f.temporadaId === temporadaId)
      .sort((a, b) => a.ordem - b.ordem);
  }
}

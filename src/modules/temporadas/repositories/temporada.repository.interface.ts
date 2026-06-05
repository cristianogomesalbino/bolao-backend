export interface Temporada {
  id: string;
  ano: number;
  campeonatoId: string;
  dataCriacao: Date;
  atualizadoEm?: Date;
}

export interface TemporadaComCampeonato extends Temporada {
  campeonato?: {
    id: string;
    nome: string;
    dataCriacao: Date;
    atualizadoEm: Date;
  } | null;
}

export interface CriarTemporadaData {
  ano: number;
  campeonatoId: string;
}

export interface TemporadaRepository {
  criar(data: CriarTemporadaData): Promise<Temporada>;
  buscarTodos(): Promise<TemporadaComCampeonato[]>;
  buscarPorId(id: string): Promise<Temporada | null>;
}

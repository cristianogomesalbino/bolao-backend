export type StatusCampeonato = 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'FINALIZADO';

export interface Campeonato {
  id: string;
  nome: string;
  status: StatusCampeonato;
  dataCriacao: Date;
  atualizadoEm: Date;
}

export interface CampeonatoRepository {
  criar(data: { nome: string }): Promise<Campeonato>;
  buscarTodos(): Promise<Campeonato[]>;
  buscarPorId(id: string): Promise<Campeonato | null>;
  atualizarStatus(id: string, status: StatusCampeonato): Promise<Campeonato>;
}

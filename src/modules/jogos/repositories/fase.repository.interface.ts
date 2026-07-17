/**
 * Tipos e interface do repositório de Fases.
 */

export interface Fase {
  readonly id: string;
  readonly nome: string;
  readonly tipo: 'PONTOS_CORRIDOS' | 'MATA_MATA';
  readonly ordem: number;
  readonly idaVolta: boolean;
  readonly temporadaId: string;
  readonly dataCriacao: Date;
  readonly atualizadoEm: Date;
}

export interface FaseComTemporada extends Fase {
  readonly temporada?: {
    readonly id: string;
    readonly ano: number;
    readonly campeonato?: {
      readonly id: string;
      readonly nome: string;
    };
  };
}

export interface CriarFaseData {
  readonly nome: string;
  readonly tipo: 'PONTOS_CORRIDOS' | 'MATA_MATA';
  readonly ordem: number;
  readonly idaVolta?: boolean;
  readonly temporadaId: string;
}

export interface FaseRepository {
  criar(data: CriarFaseData): Promise<Fase>;
  criarVarios(data: CriarFaseData[]): Promise<Fase[]>;
  buscarPorId(id: string): Promise<FaseComTemporada | null>;
  buscarPorTemporada(temporadaId: string): Promise<Fase[]>;
  buscarPorCampeonatoENome(
    nomeCampeonato: string,
    nomeFase: string,
  ): Promise<{ id: string } | null>;
}

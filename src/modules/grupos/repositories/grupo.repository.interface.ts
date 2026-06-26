export interface FiltrosGrupo {
  ativo: boolean;
  membro?: boolean;
  usuarioId?: string;
  privado?: boolean;
  busca?: string;
}

export interface GrupoRepository {
  criar(data: {
    nome: string;
    temporadaId: string;
    privado: boolean;
    codigoConvite: string | null;
    permitirPalpiteAutomatico: boolean;
    maxParticipantes: number;
    permitirPalpiteDobrado: boolean;
    criadoPor: string;
  }): Promise<any>;
  buscarTodos(filtros: { ativo: boolean }): Promise<any[]>;
  buscarComFiltros(filtros: FiltrosGrupo): Promise<any[]>;
  buscarPorId(id: string): Promise<any>;
  buscarPorIdSimples(id: string): Promise<any>;
  buscarPorCodigoConvite(codigo: string): Promise<any>;
  atualizar(
    id: string,
    data: Partial<{
      nome: string;
      icone: string;
      privado: boolean;
      maxParticipantes: number;
      permitirPalpiteAutomatico: boolean;
      ativo: boolean;
      permitirPalpiteDobrado: boolean;
      codigoConvite: string;
      criadoPor: string;
    }>,
  ): Promise<any>;
  remover(id: string): Promise<void>;
  buscarPorTemporadaId(temporadaId: string): Promise<any[]>;
}

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
  buscarPorId(id: string): Promise<any>;
  buscarPorIdSimples(id: string): Promise<any>;
  buscarPorCodigoConvite(codigo: string): Promise<any>;
  atualizar(id: string, data: Partial<{ nome: string; privado: boolean; permitirPalpiteAutomatico: boolean; ativo: boolean; permitirPalpiteDobrado: boolean; codigoConvite: string; criadoPor: string }>): Promise<any>;
  remover(id: string): Promise<void>;
  buscarPorTemporadaId(temporadaId: string): Promise<any[]>;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  perfil: string;
  ativo: boolean;
  grupoFavoritoId: string | null;
  toursCompletos: string[];
  dicasDispensadas: string[];
  toastDescobrilidadeVisto: boolean;
  dataCriacao: Date;
  atualizadoEm: Date;
}

export interface AtualizarUsuarioData {
  nome?: string;
  email?: string;
  senha?: string;
  grupoFavoritoId?: string | null;
  toursCompletos?: string[];
  dicasDispensadas?: string[];
  toastDescobrilidadeVisto?: boolean;
}

export interface UsuarioRepository {
  criar(data: {
    nome: string;
    email: string;
    senha: string;
    ativo: boolean;
  }): Promise<Usuario>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  listar(filtros: { ativo: boolean }): Promise<Usuario[]>;
  atualizar(id: string, data: AtualizarUsuarioData): Promise<Usuario | null>;
  desativar(id: string): Promise<Usuario | null>;
}

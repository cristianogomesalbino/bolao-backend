export interface UsuarioRepository {
  criar(data: { nome: string; email: string; senha: string; ativo: boolean }): Promise<any>;
  buscarPorId(id: string): Promise<any>;
  buscarPorEmail(email: string): Promise<any>;
  listar(filtros: { ativo: boolean }): Promise<any[]>;
  atualizar(id: string, data: Partial<{ nome: string; email: string; senha: string }>): Promise<any>;
  desativar(id: string): Promise<any>;
}

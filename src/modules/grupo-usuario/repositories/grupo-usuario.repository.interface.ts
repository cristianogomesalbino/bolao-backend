/** Retorno de listarPorGrupo (select role + usuario id/nome). */
export interface GrupoUsuarioMembro {
  readonly role: string;
  readonly usuario: {
    readonly id: string;
    readonly nome: string;
  };
}

export interface GrupoUsuarioRepository {
  criar(
    data: { usuarioId: string; grupoId: string; role: string },
    include?: any,
  ): Promise<any>;
  buscarPorChave(usuarioId: string, grupoId: string): Promise<any>;
  /**
   * Tipagem ampla: o Prisma devolve só role+usuario, mas o controller
   * ainda passa o resultado ao presenter completo (GrupoUsuarioData).
   */
  listarPorGrupo(grupoId: string): Promise<any[]>;
  listarPorUsuario(usuarioId: string): Promise<any[]>;
  contarPorGrupo(grupoId: string): Promise<number>;
  contarAdminsPorGrupo(grupoId: string): Promise<number>;
  remover(usuarioId: string, grupoId: string): Promise<void>;
  listarPorGrupoComUsuario(grupoId: string): Promise<any[]>;
  atualizarRole(usuarioId: string, grupoId: string, role: string): Promise<any>;
}

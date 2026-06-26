export interface PalpiteDobradoRepository {
  criar(data: {
    usuarioId: string;
    jogoId: string;
    grupoId: string;
  }): Promise<any>;
  remover(usuarioId: string, jogoId: string, grupoId: string): Promise<void>;
  buscarPorChave(
    usuarioId: string,
    jogoId: string,
    grupoId: string,
  ): Promise<any>;
  listarPorJogoEGrupo(jogoId: string, grupoId: string): Promise<any[]>;
  listarPorJogosEGrupo(jogoIds: string[], grupoId: string): Promise<any[]>;
  listarPorUsuarioEGrupo(usuarioId: string, grupoId: string): Promise<any[]>;
}

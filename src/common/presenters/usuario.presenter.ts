export class UsuarioPresenter {
  static toHttp(usuario: any) {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      dataCriacao: usuario.dataCriacao,
      atualizadoEm: usuario.atualizadoEm,
    };
  }
}

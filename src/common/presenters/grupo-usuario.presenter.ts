import { UsuarioPresenter } from './usuario.presenter';
import { GrupoPresenter } from './grupo.presenter';

export class GrupoUsuarioPresenter {
  static toHttp(grupoUsuario: any) {
    return {
      id: grupoUsuario.id,
      usuarioId: grupoUsuario.usuarioId,
      grupoId: grupoUsuario.grupoId,
      role: grupoUsuario.role,
      ...(grupoUsuario.usuario && {
        usuario: UsuarioPresenter.toHttp(grupoUsuario.usuario),
      }),
      ...(grupoUsuario.grupo && {
        grupo: GrupoPresenter.toHttp(grupoUsuario.grupo),
      }),
    };
  }
}

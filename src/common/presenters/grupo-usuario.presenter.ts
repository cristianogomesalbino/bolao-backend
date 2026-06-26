import { UsuarioPresenter } from './usuario.presenter';
import { GrupoPresenter } from './grupo.presenter';

interface UsuarioRelacao {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  grupoFavoritoId: string | null;
  dataCriacao: Date;
  atualizadoEm: Date;
}

interface GrupoRelacao {
  id: string;
  nome: string;
  icone: string | null;
  temporadaId: string;
  privado: boolean;
  codigoConvite: string | null;
  permitirPalpiteAutomatico: boolean;
  maxParticipantes: number;
  permitirPalpiteDobrado: boolean;
  ativo: boolean;
  dataCriacao: Date;
  criadoPor: string;
}

interface GrupoUsuarioData {
  id: string;
  usuarioId: string;
  grupoId: string;
  role: string;
  usuario?: UsuarioRelacao;
  grupo?: GrupoRelacao;
}

export class GrupoUsuarioPresenter {
  static toHttp(grupoUsuario: GrupoUsuarioData) {
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

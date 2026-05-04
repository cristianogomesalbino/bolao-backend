import { factoryUsuario } from '../DataFactories/UsuarioFactory';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';

export function seedUsuariosForGrupoSuite() {
  return [
    factoryUsuario('user_to_manage_grupo_suite'),
    factoryUsuario('user_member_grupo_suite'),
    factoryUsuario('user_to_add_grupo_suite'),
  ];
}

export const GRUPO_ATTEMPT_USUARIOS = {
  admin_grupo: factoryUsuario('user_to_manage_grupo_suite'),
  membro_grupo: factoryUsuario('user_member_grupo_suite'),
  user_fora: factoryUsuario('user_to_manage_campeonato_suite'),
};

export const GRUPO_SIMPLE_ATTEMPT_USUARIOS = {
  user: factoryUsuario('user_to_manage_grupo_suite'),
  super_admin: factoryUsuario('super_admin_to_manage_suite'),
};

export async function seedGrupoAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForGrupoSuite());
  await createUsuario(factoryUsuario('user_to_manage_campeonato_suite'));
}

export async function seedGrupoSimpleAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForGrupoSuite());
  await createUsuario(factoryUsuario('super_admin_to_manage_suite'));
}

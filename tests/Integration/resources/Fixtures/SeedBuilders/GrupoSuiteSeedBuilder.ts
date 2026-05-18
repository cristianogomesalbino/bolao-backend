import { build } from '../DataBuilder';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';

export function seedUsuariosForGrupoSuite() {
  return [
    build('for_grupo_suite', 'user_admin', 'usuario'),
    build('for_grupo_suite', 'user_member', 'usuario'),
    build('for_grupo_suite', 'user_to_add', 'usuario'),
  ];
}

export const GRUPO_ATTEMPT_USUARIOS = {
  admin_grupo: build('for_grupo_suite', 'user_admin', 'usuario'),
  membro_grupo: build('for_grupo_suite', 'user_member', 'usuario'),
  user_fora: build('for_grupo_suite', 'user_fora', 'usuario'),
};

export const GRUPO_SIMPLE_ATTEMPT_USUARIOS = {
  user: build('for_grupo_suite', 'user_admin', 'usuario'),
  super_admin: build('for_campeonato_suite', 'super_admin', 'usuario'),
};

export async function seedGrupoAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForGrupoSuite());
  await createUsuario(build('for_grupo_suite', 'user_fora', 'usuario'));
}

export async function seedGrupoSimpleAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForGrupoSuite());
  await createUsuario(build('for_campeonato_suite', 'super_admin', 'usuario'));
}

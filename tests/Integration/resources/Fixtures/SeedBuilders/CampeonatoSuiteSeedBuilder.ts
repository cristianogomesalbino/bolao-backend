import { build } from '../DataBuilder';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';

export function seedUsuariosForCampeonatoSuite() {
  return [build('for_campeonato_suite', 'user_manage', 'usuario')];
}

export const CAMPEONATO_ATTEMPT_USUARIOS = {
  user: build('for_campeonato_suite', 'user_manage', 'usuario'),
  super_admin: build('for_campeonato_suite', 'super_admin', 'usuario'),
};

export async function seedCampeonatoAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForCampeonatoSuite());
  await createUsuario(build('for_campeonato_suite', 'super_admin', 'usuario'));
}

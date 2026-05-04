import { factoryUsuario } from '../DataFactories/UsuarioFactory';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';

export function seedUsuariosForCampeonatoSuite() {
  return [factoryUsuario('user_to_manage_campeonato_suite')];
}

export const CAMPEONATO_ATTEMPT_USUARIOS = {
  user: factoryUsuario('user_to_manage_campeonato_suite'),
  super_admin: factoryUsuario('super_admin_to_manage_suite'),
};

export async function seedCampeonatoAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForCampeonatoSuite());
  await createUsuario(factoryUsuario('super_admin_to_manage_suite'));
}

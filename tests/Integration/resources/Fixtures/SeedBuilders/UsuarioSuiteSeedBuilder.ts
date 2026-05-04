import { factoryUsuario } from '../DataFactories/UsuarioFactory';
import { createUsuarios } from '../../Database/UsuarioDatabase';

export function seedUsuariosForUsuarioSuite() {
  return [
    factoryUsuario('user_to_manage_usuario_suite'),
    factoryUsuario('super_admin_to_manage_suite'),
  ];
}

export const USUARIO_ATTEMPT_USUARIOS = {
  user: factoryUsuario('user_to_manage_usuario_suite'),
  super_admin: factoryUsuario('super_admin_to_manage_suite'),
};

export async function seedUsuarioAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForUsuarioSuite());
}

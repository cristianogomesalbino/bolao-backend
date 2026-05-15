import { factoryUsuario, factoryUsuarioAttemptRequests } from '../DataFactories/UsuarioFactory';
import { createUsuarios } from '../../Database/UsuarioDatabase';

const attemptUsuarios = factoryUsuarioAttemptRequests();

export function seedUsuariosForUsuarioSuite() {
  return [
    factoryUsuario('user_to_manage_usuario_suite'),
    factoryUsuario('super_admin_to_manage_suite'),
  ];
}

export const USUARIO_ATTEMPT_USUARIOS = {
  usuario_comum: attemptUsuarios.user,
  super_admin: attemptUsuarios.super_admin,
};

export async function seedUsuarioAttempt(): Promise<void> {
  await createUsuarios(Object.values(USUARIO_ATTEMPT_USUARIOS));
}

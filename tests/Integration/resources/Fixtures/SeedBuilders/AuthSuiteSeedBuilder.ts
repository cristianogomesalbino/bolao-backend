import { factoryUsuario } from '../DataFactories/UsuarioFactory';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';

// ---- Seed para specs de CRUD (login.spec.ts) ----

export function seedUsuariosForAuthSuite() {
  return [factoryUsuario('adm_to_manage_auth_suite')];
}

// ---- Config para AttemptRequests ----

export const AUTH_ATTEMPT_USUARIOS = {
  user: factoryUsuario('adm_to_manage_auth_suite'),
  super_admin: factoryUsuario('super_admin_to_manage_suite'),
};

export async function seedAuthAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForAuthSuite());
  await createUsuario(factoryUsuario('super_admin_to_manage_suite'));
}

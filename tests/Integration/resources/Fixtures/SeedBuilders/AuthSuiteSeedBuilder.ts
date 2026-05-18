import { build } from '../DataBuilder';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';

// ---- Seed para specs de CRUD (auth.spec.ts) ----

export function seedUsuariosForAuthSuite() {
  return [build('for_auth_suite', 'adm_manage', 'usuario')];
}

// ---- Config para AttemptRequests ----

export const AUTH_ATTEMPT_USUARIOS = {
  user: build('for_auth_suite', 'adm_manage', 'usuario'),
  super_admin: build('for_auth_suite', 'super_admin', 'usuario'),
};

export async function seedAuthAttempt(): Promise<void> {
  await createUsuarios(seedUsuariosForAuthSuite());
  await createUsuario(build('for_auth_suite', 'super_admin', 'usuario'));
}

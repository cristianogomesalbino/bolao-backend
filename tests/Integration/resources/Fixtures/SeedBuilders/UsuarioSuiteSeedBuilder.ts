import { build } from '../DataBuilder';
import { factoryUsuarioAttemptRequests } from '../DataFactories/UsuarioFactory';
import { createUsuarios, insertUsuario, selectUsuarioByEmail } from '../../Database/UsuarioDatabase';

const attemptUsuarios = factoryUsuarioAttemptRequests();

export function seedUsuariosForUsuarioSuite() {
  return [
    build('for_usuario_suite', 'user_manage', 'usuario'),
    build('for_usuario_suite', 'super_admin', 'usuario'),
  ];
}

export const USUARIO_ATTEMPT_USUARIOS = {
  usuario_comum: attemptUsuarios.user,
  super_admin: attemptUsuarios.super_admin,
};

export async function seedUsuarioAttempt(): Promise<void> {
  await createUsuarios(Object.values(USUARIO_ATTEMPT_USUARIOS));
}

export async function seedUsuarioAttemptWithId(): Promise<{ userId: string }> {
  await seedUsuarioAttempt();
  const userId = await selectUsuarioByEmail(USUARIO_ATTEMPT_USUARIOS.usuario_comum.email);
  return { userId: userId! };
}

export async function seedUsuarioDelete(): Promise<{ userId: string }> {
  await seedUsuarioAttempt();
  const usuario = attemptUsuarios.para_deletar;
  await insertUsuario(usuario);
  const userId = await selectUsuarioByEmail(usuario.email);
  return { userId: userId! };
}

import { factoryUsuario } from '../DataFactories/UsuarioFactory';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';

// Temporada usa os mesmos usuários de Campeonato
export const TEMPORADA_ATTEMPT_USUARIOS = {
  user: factoryUsuario('user_to_manage_campeonato_suite'),
  super_admin: factoryUsuario('super_admin_to_manage_suite'),
};

export async function seedTemporadaAttempt(): Promise<void> {
  await createUsuarios([factoryUsuario('user_to_manage_campeonato_suite')]);
  await createUsuario(factoryUsuario('super_admin_to_manage_suite'));
}

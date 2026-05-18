import { factoryUsuario } from '../DataFactories/UsuarioFactory';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../../Database/CampeonatoDatabase';

const CAMPEONATO_TEMPORADA_SEED = 'Campeonato Temporada Attempt QA';

// Temporada usa os mesmos usuários de Campeonato
export const TEMPORADA_ATTEMPT_USUARIOS = {
  user: factoryUsuario('user_to_manage_campeonato_suite'),
  super_admin: factoryUsuario('super_admin_to_manage_suite'),
};

export async function seedTemporadaAttempt(): Promise<void> {
  await createUsuarios([factoryUsuario('user_to_manage_campeonato_suite')]);
  await createUsuario(factoryUsuario('super_admin_to_manage_suite'));
  await insertCampeonato(CAMPEONATO_TEMPORADA_SEED);
}

export async function seedTemporadaAttemptWithCampeonato(): Promise<{ campeonatoId: string }> {
  await seedTemporadaAttempt();
  const campeonatoId = await selectCampeonatoByNome(CAMPEONATO_TEMPORADA_SEED);
  return { campeonatoId: campeonatoId! };
}

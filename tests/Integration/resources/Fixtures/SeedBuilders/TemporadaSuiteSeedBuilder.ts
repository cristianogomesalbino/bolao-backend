import { build } from '../DataBuilder';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../../Database/CampeonatoDatabase';

// Temporada usa os mesmos usuários de Campeonato + precisa de campeonato no banco
export const TEMPORADA_ATTEMPT_USUARIOS = {
  user: build('for_temporada_suite', 'user_manage', 'usuario'),
  super_admin: build('for_temporada_suite', 'super_admin', 'usuario'),
};

export async function seedTemporadaAttempt(): Promise<void> {
  await createUsuarios([build('for_temporada_suite', 'user_manage', 'usuario')]);
  await createUsuario(build('for_temporada_suite', 'super_admin', 'usuario'));
  const campeonato = build('for_temporada_suite', 'user_manage', 'campeonato');
  await insertCampeonato(campeonato.nome);
}

export async function seedTemporadaAttemptWithCampeonato(): Promise<{ campeonatoId: string }> {
  await seedTemporadaAttempt();
  const campeonato = build('for_temporada_suite', 'user_manage', 'campeonato');
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  return { campeonatoId: campeonatoId! };
}

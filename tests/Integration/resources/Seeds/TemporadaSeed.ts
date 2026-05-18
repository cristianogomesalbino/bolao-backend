// ============================================================
// SEED — Temporada Suite
// ============================================================

import { build } from '../Fixtures/DataBuilder';
import { seedUsuariosForCampeonatoSuite } from '../Fixtures/SeedBuilders/CampeonatoSuiteSeedBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../Database/CampeonatoDatabase';

export async function seedingForTemporadaSuite(): Promise<void> {
  const usuarios = seedUsuariosForCampeonatoSuite();
  await createUsuarios(usuarios);
  const campeonato = build('for_temporada_suite', 'user_manage', 'campeonato');
  await insertCampeonato(campeonato.nome);
}

export async function getTemporadaSuiteCampeonatoId(): Promise<string> {
  const campeonato = build('for_temporada_suite', 'user_manage', 'campeonato');
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  return campeonatoId!;
}

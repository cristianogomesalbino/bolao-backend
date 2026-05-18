// ============================================================
// SEED — Temporada Suite
// ============================================================

import { seedUsuariosForCampeonatoSuite } from '../Fixtures/SeedBuilders/CampeonatoSuiteSeedBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../Database/CampeonatoDatabase';

const CAMPEONATO_TEMPORADA_SUITE_SEED = 'Campeonato Temporada Suite QA';

export async function seedingForTemporadaSuite(): Promise<void> {
  const usuarios = seedUsuariosForCampeonatoSuite();
  await createUsuarios(usuarios);
  await insertCampeonato(CAMPEONATO_TEMPORADA_SUITE_SEED);
}

export async function getTemporadaSuiteCampeonatoId(): Promise<string> {
  const campeonatoId = await selectCampeonatoByNome(CAMPEONATO_TEMPORADA_SUITE_SEED);
  return campeonatoId!;
}

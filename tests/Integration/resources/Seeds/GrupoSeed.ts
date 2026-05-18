// ============================================================
// SEED — Grupo Suite
// ============================================================

import { seedUsuariosForGrupoSuite } from '../Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../Database/CampeonatoDatabase';
import { insertTemporada, selectTemporadaByCampeonatoIdAndAno } from '../Database/TemporadaDatabase';

const CAMPEONATO_GRUPO_SEED = 'Campeonato Grupo Suite QA';

export async function seedingForGrupoSuite(): Promise<void> {
  const usuarios = seedUsuariosForGrupoSuite();
  await createUsuarios(usuarios);
  await insertCampeonato(CAMPEONATO_GRUPO_SEED);
  const campeonatoId = await selectCampeonatoByNome(CAMPEONATO_GRUPO_SEED);
  await insertTemporada(campeonatoId!, 2026);
}

export async function getGrupoSuiteTemporadaId(): Promise<string> {
  const campeonatoId = await selectCampeonatoByNome(CAMPEONATO_GRUPO_SEED);
  const temporadaId = await selectTemporadaByCampeonatoIdAndAno(campeonatoId!, 2026);
  return temporadaId!;
}

// ============================================================
// SEED — Campeonato Suite
// ============================================================

import { seedUsuariosForCampeonatoSuite } from '../Fixtures/SeedBuilders/CampeonatoSuiteSeedBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';

export async function seedingForCampeonatoSuite(): Promise<void> {
  const usuarios = seedUsuariosForCampeonatoSuite();
  await createUsuarios(usuarios);
}

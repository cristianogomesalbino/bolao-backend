// ============================================================
// SEED — Grupo Suite
// ============================================================

import { seedUsuariosForGrupoSuite } from '../Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';

export async function seedingForGrupoSuite(): Promise<void> {
  const usuarios = seedUsuariosForGrupoSuite();
  await createUsuarios(usuarios);
}

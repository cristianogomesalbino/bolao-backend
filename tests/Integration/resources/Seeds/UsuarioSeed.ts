// ============================================================
// SEED — Usuario Suite
// ============================================================

import { seedUsuariosForUsuarioSuite } from '../Fixtures/SeedBuilders/UsuarioSuiteSeedBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';

export async function seedingForUsuarioSuite(): Promise<void> {
  const usuarios = seedUsuariosForUsuarioSuite();
  await createUsuarios(usuarios);
}

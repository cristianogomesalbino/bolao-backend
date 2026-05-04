// ============================================================
// SEED — Auth Suite
// ============================================================

import { seedUsuariosForAuthSuite } from '../Fixtures/SeedBuilders/AuthSuiteSeedBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';

export async function seedingForAuthSuite(): Promise<void> {
  const usuarios = seedUsuariosForAuthSuite();
  await createUsuarios(usuarios);
}

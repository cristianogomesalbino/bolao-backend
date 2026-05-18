// ============================================================
// SEED — GrupoUsuario Suite
// ============================================================

import { build } from '../Fixtures/DataBuilder';
import { seedUsuariosForGrupoSuite } from '../Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../Database/CampeonatoDatabase';
import { insertTemporada, selectTemporadaByCampeonatoIdAndAno } from '../Database/TemporadaDatabase';

export async function seedingForGrupoUsuarioSuite(): Promise<void> {
  const usuarios = seedUsuariosForGrupoSuite();
  await createUsuarios(usuarios);
  const data = build('for_grupo_usuario_suite', 'user_admin');
  await insertCampeonato(data.campeonato.nome);
  const campeonatoId = await selectCampeonatoByNome(data.campeonato.nome);
  await insertTemporada(campeonatoId!, data.temporada.ano);
}

export async function getGrupoUsuarioSuiteTemporadaId(): Promise<string> {
  const data = build('for_grupo_usuario_suite', 'user_admin');
  const campeonatoId = await selectCampeonatoByNome(data.campeonato.nome);
  const temporadaId = await selectTemporadaByCampeonatoIdAndAno(campeonatoId!, data.temporada.ano);
  return temporadaId!;
}

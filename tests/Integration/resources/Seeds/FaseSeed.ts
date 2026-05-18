// ============================================================
// SEED — Fase Suite
// ============================================================

import { build } from '../Fixtures/DataBuilder';
import { createUsuarios } from '../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../Database/CampeonatoDatabase';
import { insertTemporada, selectTemporadaByCampeonatoIdAndAno } from '../Database/TemporadaDatabase';

export async function seedingForFaseSuite(): Promise<void> {
  await createUsuarios([build('for_fase_suite', 'user_manage', 'usuario')]);
  const campeonato = build('for_fase_suite', 'user_manage', 'campeonato');
  await insertCampeonato(campeonato.nome);
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  const temporada = build('for_fase_suite', 'user_manage', 'temporada');
  await insertTemporada(campeonatoId!, temporada.ano);
}

export async function getFaseSuiteTemporadaId(): Promise<string> {
  const campeonato = build('for_fase_suite', 'user_manage', 'campeonato');
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  const temporada = build('for_fase_suite', 'user_manage', 'temporada');
  const temporadaId = await selectTemporadaByCampeonatoIdAndAno(campeonatoId!, temporada.ano);
  return temporadaId!;
}

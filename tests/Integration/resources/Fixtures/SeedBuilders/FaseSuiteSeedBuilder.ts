import { build } from '../DataBuilder';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../../Database/CampeonatoDatabase';
import { insertTemporada, selectTemporadaByCampeonatoIdAndAno } from '../../Database/TemporadaDatabase';

export const FASE_ATTEMPT_USUARIOS = {
  user: build('for_fase_suite', 'user_manage', 'usuario'),
  super_admin: build('for_fase_suite', 'super_admin', 'usuario'),
};

export async function seedFaseAttempt(): Promise<void> {
  await createUsuarios([build('for_fase_suite', 'user_manage', 'usuario')]);
  await createUsuario(build('for_fase_suite', 'super_admin', 'usuario'));
  const campeonato = build('for_fase_suite', 'user_manage', 'campeonato');
  await insertCampeonato(campeonato.nome);
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  const temporada = build('for_fase_suite', 'user_manage', 'temporada');
  await insertTemporada(campeonatoId!, temporada.ano);
}

export async function seedFaseAttemptWithTemporada(): Promise<{ temporadaId: string }> {
  await seedFaseAttempt();
  const campeonato = build('for_fase_suite', 'user_manage', 'campeonato');
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  const temporada = build('for_fase_suite', 'user_manage', 'temporada');
  const temporadaId = await selectTemporadaByCampeonatoIdAndAno(campeonatoId!, temporada.ano);
  return { temporadaId: temporadaId! };
}

export async function seedJogoAttemptWithFase(): Promise<{ temporadaId: string; faseId: string }> {
  const { temporadaId } = await seedFaseAttemptWithTemporada();
  const fase = build('for_fase_suite', 'user_manage', 'fase');
  const { insertFase, selectFaseByTemporadaIdAndNome } = await import('../../Database/FaseDatabase');
  await insertFase(temporadaId, fase.nome, fase.tipo, fase.ordem);
  const faseId = await selectFaseByTemporadaIdAndNome(temporadaId, fase.nome);
  return { temporadaId, faseId: faseId! };
}

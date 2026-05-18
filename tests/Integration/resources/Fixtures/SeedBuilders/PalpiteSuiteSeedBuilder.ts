import { build } from '../DataBuilder';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../../Database/CampeonatoDatabase';
import { insertTemporada, selectTemporadaByCampeonatoIdAndAno } from '../../Database/TemporadaDatabase';
import { insertFase, selectFaseByTemporadaIdAndNome } from '../../Database/FaseDatabase';

export const PALPITE_ATTEMPT_USUARIOS = {
  user: build('for_palpite_suite', 'user_manage', 'usuario'),
  super_admin: build('for_palpite_suite', 'super_admin', 'usuario'),
};

export async function seedPalpiteAttempt(): Promise<void> {
  await createUsuarios([build('for_palpite_suite', 'user_manage', 'usuario')]);
  await createUsuario(build('for_palpite_suite', 'super_admin', 'usuario'));
  const campeonato = build('for_palpite_suite', 'user_manage', 'campeonato');
  await insertCampeonato(campeonato.nome);
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  const temporada = build('for_palpite_suite', 'user_manage', 'temporada');
  await insertTemporada(campeonatoId!, temporada.ano);
  const temporadaId = await selectTemporadaByCampeonatoIdAndAno(campeonatoId!, temporada.ano);
  const fase = build('for_palpite_suite', 'user_manage', 'fase');
  await insertFase(temporadaId!, fase.nome, fase.tipo, fase.ordem);
}

export async function seedPalpiteAttemptWithFase(): Promise<{ temporadaId: string; faseId: string }> {
  await seedPalpiteAttempt();
  const campeonato = build('for_palpite_suite', 'user_manage', 'campeonato');
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  const temporada = build('for_palpite_suite', 'user_manage', 'temporada');
  const temporadaId = await selectTemporadaByCampeonatoIdAndAno(campeonatoId!, temporada.ano);
  const fase = build('for_palpite_suite', 'user_manage', 'fase');
  const faseId = await selectFaseByTemporadaIdAndNome(temporadaId!, fase.nome);
  return { temporadaId: temporadaId!, faseId: faseId! };
}

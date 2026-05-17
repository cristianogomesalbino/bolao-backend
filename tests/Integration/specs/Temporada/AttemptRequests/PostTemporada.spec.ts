import {
  test, HTTP, INVALID,
  describeAttemptSuite,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /temporadas',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP.BAD_REQUEST },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP.BAD_REQUEST },
  ],
  usuarios: TEMPORADA_ATTEMPT_USUARIOS,
  mockData: {
    route: 'temporadas',
    payload: { ano: 2026, campeonatoId: INVALID.UUID_INEXISTENTE },
  },
  seed: seedTemporadaAttempt,
});

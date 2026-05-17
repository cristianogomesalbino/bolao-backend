import {
  test, HTTP,
  describeAttemptSuite,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /temporadas',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP.OK },
  ],
  usuarios: TEMPORADA_ATTEMPT_USUARIOS,
  mockData: { route: 'temporadas' },
  seed: seedTemporadaAttempt,
});

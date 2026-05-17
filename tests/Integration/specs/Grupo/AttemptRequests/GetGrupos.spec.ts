import {
  test, HTTP,
  describeAttemptSuite,
  GRUPO_SIMPLE_ATTEMPT_USUARIOS, seedGrupoSimpleAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /grupos',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP.OK },
  ],
  usuarios: GRUPO_SIMPLE_ATTEMPT_USUARIOS,
  mockData: { route: 'grupos' },
  seed: seedGrupoSimpleAttempt,
});

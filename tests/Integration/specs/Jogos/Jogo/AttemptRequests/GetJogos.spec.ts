import {
  test, HTTP,
  describeAttemptSuite,
  FASE_ATTEMPT_USUARIOS, seedJogoAttemptWithFase,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /fases/:id/jogos',
  usuarios: FASE_ATTEMPT_USUARIOS,
  seed: seedJogoAttemptWithFase,
  routeResolver: (data) => `fases/${data.faseId}/jogos`,
  // prettier-ignore
  scenarios: [
    ['sem_token',     'GET',    HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'GET',    HTTP.OK,                 'listando jogos da fase'],
    ['super_admin',   'GET',    HTTP.OK,                 'admin listando jogos'],
  ],
});

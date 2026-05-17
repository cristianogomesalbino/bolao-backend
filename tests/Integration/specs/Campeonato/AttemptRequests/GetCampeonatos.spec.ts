import {
  test, HTTP,
  describeAttemptSuite, buildCampeonatoMock,
  CAMPEONATO_ATTEMPT_USUARIOS, seedCampeonatoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /campeonatos',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP.OK },
  ],
  usuarios: CAMPEONATO_ATTEMPT_USUARIOS,
  mockData: buildCampeonatoMock('get_campeonatos'),
  seed: seedCampeonatoAttempt,
});

import {
  test, HTTP,
  describeAttemptSuite,
  CAMPEONATO_ATTEMPT_USUARIOS, seedCampeonatoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /campeonatos',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP.CREATED },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP.CREATED },
  ],
  usuarios: CAMPEONATO_ATTEMPT_USUARIOS,
  mockData: { route: 'campeonatos' },
  seed: seedCampeonatoAttempt,
  payloadResolver: () => ({ nome: `Camp Attempt ${Date.now()}` }),
});

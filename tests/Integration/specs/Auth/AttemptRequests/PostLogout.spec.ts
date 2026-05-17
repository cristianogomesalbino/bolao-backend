import {
  test, HTTP,
  describeAttemptSuite, buildAuthMock,
  AUTH_ATTEMPT_USUARIOS, seedAuthAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /auth/logout',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP.CREATED },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP.CREATED },
  ],
  usuarios: AUTH_ATTEMPT_USUARIOS,
  mockData: buildAuthMock('post_logout'),
  seed: seedAuthAttempt,
});

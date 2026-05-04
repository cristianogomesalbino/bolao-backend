import {
  test,
  HTTP_UNAUTHORIZED,
  describeAttemptSuite,
  buildAuthMock,
  AUTH_ATTEMPT_USUARIOS,
  seedAuthAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /auth/refresh',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP_UNAUTHORIZED },
  ],
  usuarios: AUTH_ATTEMPT_USUARIOS,
  mockData: buildAuthMock('post_refresh'),
  seed: seedAuthAttempt,
});

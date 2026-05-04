import {
  test,
  HTTP_CREATED,
  describeAttemptSuite,
  buildAuthMock,
  AUTH_ATTEMPT_USUARIOS,
  seedAuthAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /auth/login',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP_CREATED },
  ],
  usuarios: AUTH_ATTEMPT_USUARIOS,
  mockData: buildAuthMock('post_login'),
  seed: seedAuthAttempt,
});

import {
  test,
  HTTP_UNAUTHORIZED,
  HTTP_OK,
  describeAttemptSuite,
  buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /usuarios/me',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP_OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP_OK },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  mockData: buildUsuarioMock('get_usuario_me'),
  seed: seedUsuarioAttempt,
});

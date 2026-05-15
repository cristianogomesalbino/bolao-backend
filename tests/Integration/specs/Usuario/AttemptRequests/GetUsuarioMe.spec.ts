import {
  test, HTTP,
  describeAttemptSuite, buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /usuarios/me',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP.OK },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  mockData: buildUsuarioMock('get_usuario_me'),
  seed: seedUsuarioAttempt,
});

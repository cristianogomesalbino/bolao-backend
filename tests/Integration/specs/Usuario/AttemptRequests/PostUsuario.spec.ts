import {
  test,
  HTTP_CREATED,
  describeAttemptSuite,
  buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /usuarios',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'usuario_comum', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP_CREATED, skip: 'Habilitar método não suportado' },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  mockData: buildUsuarioMock('post_usuario'),
  seed: seedUsuarioAttempt,
  payloadResolver: () => ({
    ...buildUsuarioMock('post_usuario').payload,
    email: `attempt.${Date.now()}@teste.qa`,
  }),
});

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
    { perfil: 'user', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP_CREATED, skip:'Habilitar metodo nao suportado'},
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  mockData: buildUsuarioMock('post_usuario'),
  seed: seedUsuarioAttempt,
  payloadResolver: () => ({
    nome: 'Attempt User QA',
    email: `attempt.${Date.now()}@teste.qa`,
    senha: 'Teste123!',
  }),
});

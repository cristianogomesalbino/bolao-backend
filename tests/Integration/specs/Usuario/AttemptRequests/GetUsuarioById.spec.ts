import {
  test,
  HTTP_UNAUTHORIZED,
  HTTP_OK,
  describeAttemptSuite,
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
  UsuarioRoute,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /usuarios/:id',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP_OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP_OK },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  seed: seedUsuarioAttempt,
  setup: async (request) => {
    const user = USUARIO_ATTEMPT_USUARIOS.user;
    const response = await UsuarioRoute.getUsuarioMe(request, user);
    const body = await response.json();
    return { userId: body.id };
  },
  routeResolver: (data) => `usuarios/${data.userId}`,
});

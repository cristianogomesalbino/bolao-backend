import {
  test,
  HTTP_UNAUTHORIZED,
  HTTP_OK,
  HTTP_FORBIDDEN,
  describeAttemptSuite,
  buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
  UsuarioDB,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /usuarios/:id',
  scenarios: [
    { perfil: 'sem_token', method: 'PATCH', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'usuario_comum', method: 'PATCH', statusEsperado: HTTP_OK },
    { perfil: 'super_admin', method: 'PATCH', statusEsperado: HTTP_OK },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  seed: seedUsuarioAttempt,
  setup: async () => {
    const usuario = USUARIO_ATTEMPT_USUARIOS.usuario_comum;
    const userId = await UsuarioDB.selectUsuarioByEmail(usuario.email);
    return { userId };
  },
  routeResolver: (data) => `usuarios/${data.userId}`,
  payloadResolver: () => ({
    ...buildUsuarioMock('patch_usuario').payload,
    nome: `Attempt Patch ${Date.now()}`,
  }),
});

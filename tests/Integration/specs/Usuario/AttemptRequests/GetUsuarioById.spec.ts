import {
  test, HTTP, INVALID,
  describeAttemptSuite,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt, UsuarioDB,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /usuarios/:id',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP.BAD_REQUEST, routeOverride: `usuarios/${INVALID.UUID}` },
    { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP.FORBIDDEN, routeOverride: `usuarios/${INVALID.UUID_INEXISTENTE}` },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  seed: seedUsuarioAttempt,
  setup: async () => {
    const userId = await UsuarioDB.selectUsuarioByEmail(USUARIO_ATTEMPT_USUARIOS.usuario_comum.email);
    return { userId };
  },
  routeResolver: (data) => `usuarios/${data.userId}`,
});

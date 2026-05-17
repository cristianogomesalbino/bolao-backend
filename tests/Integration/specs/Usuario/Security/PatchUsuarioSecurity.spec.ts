import {
  test, expect, HTTP,
  describeSecuritySuite, buildUsuarioMock,
  seedUsuarioAttemptWithId, USUARIO_ATTEMPT_USUARIOS,
} from '../../../resources';

const { payload: basePayload } = buildUsuarioMock('patch_usuario');

describeSecuritySuite(test, {
  descricao: 'Segurança PATCH /usuarios/:id',
  route: 'usuarios',
  method: 'PATCH',
  basePayload: basePayload!,
  usuario: USUARIO_ATTEMPT_USUARIOS.usuario_comum,
  seed: seedUsuarioAttemptWithId,
  routeResolver: (data) => `usuarios/${data.userId}`,

  sqlInjection: {
    campos: ['nome'],
    statusEsperado: [HTTP.OK, HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST],
  },

  xss: {
    campos: ['nome'],
    statusEsperado: [HTTP.OK, HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST],
  },

  massAssignment: {
    camposSensiveis: { perfil: 'SUPER_ADMIN', ativo: false },
    statusEsperado: [HTTP.OK, HTTP.UNPROCESSABLE],
    validar: (body) => {
      if (body.perfil) expect(body.perfil).not.toBe('SUPER_ADMIN');
      if (body.ativo !== undefined) expect(body.ativo).not.toBe(false);
    },
  },

  stacktrace: {
    payloadQueForcaErro: { nome: null },
  },
});

import {
  test, expect, HTTP,
  describeSecuritySuite, buildAuthMock,
  seedAuthAttempt,
} from '../../../resources';

const { route, payload: basePayload } = buildAuthMock('post_login');

describeSecuritySuite(test, {
  descricao: 'Segurança POST /auth/login',
  route,
  method: 'POST',
  basePayload: basePayload!,
  seed: seedAuthAttempt,
  // Rota pública — sem usuario (não envia token)

  sqlInjection: {
    campos: ['email', 'senha'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.UNAUTHORIZED],
  },

  xss: {
    campos: ['email', 'senha'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.UNAUTHORIZED],
  },

  massAssignment: {
    camposSensiveis: { perfil: 'SUPER_ADMIN', ativo: false },
    statusEsperado: [HTTP.CREATED, HTTP.UNAUTHORIZED, HTTP.UNPROCESSABLE],
    validar: (body) => {
      // Backend rejeita campos extras com forbidNonWhitelisted (422)
      // Se por algum motivo aceitar, validar que não aplicou
      if (body.perfil) expect(body.perfil).not.toBe('SUPER_ADMIN');
    },
  },

  stacktrace: {
    payloadQueForcaErro: { email: null, senha: null },
  },
});

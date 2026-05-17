import {
  test, HTTP,
  describeSecuritySuite, buildAuthMock,
  seedAuthAttempt,
} from '../../../resources';

const { route, payload: basePayload } = buildAuthMock('post_resetar_senha');

describeSecuritySuite(test, {
  descricao: 'Segurança POST /auth/resetar-senha',
  route,
  method: 'POST',
  basePayload: { ...basePayload!, confirmarSenha: 'Nova123!' },
  seed: seedAuthAttempt,
  // Rota pública — sem usuario (não envia token)

  sqlInjection: {
    campos: ['token', 'novaSenha'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST],
  },

  xss: {
    campos: ['token'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST],
  },

  stacktrace: {
    payloadQueForcaErro: { token: null, novaSenha: null, confirmarSenha: null },
  },
});

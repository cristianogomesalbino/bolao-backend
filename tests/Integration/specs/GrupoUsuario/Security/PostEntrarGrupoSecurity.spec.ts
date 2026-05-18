import {
  test, HTTP,
  describeSecuritySuite,
  GRUPO_SIMPLE_ATTEMPT_USUARIOS, seedGrupoSimpleAttempt,
} from '../../../resources';

describeSecuritySuite(test, {
  descricao: 'Segurança POST /grupos/entrar',
  route: 'grupos/entrar',
  method: 'POST',
  basePayload: { codigoConvite: 'ABCD1234' },
  usuario: GRUPO_SIMPLE_ATTEMPT_USUARIOS.user,
  seed: seedGrupoSimpleAttempt,

  sqlInjection: {
    campos: ['codigoConvite'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.NOT_FOUND],
  },

  xss: {
    campos: ['codigoConvite'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.NOT_FOUND],
  },

  stacktrace: {
    payloadQueForcaErro: { codigoConvite: null },
  },
});

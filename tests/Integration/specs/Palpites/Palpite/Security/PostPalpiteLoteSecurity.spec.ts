import {
  test, HTTP,
  describeSecuritySuite,
  PALPITE_ATTEMPT_USUARIOS, seedPalpiteAttempt,
} from '../../../../resources';

const basePayload = {
  palpites: [
    { jogoId: 'a0000000-0000-4000-a000-000000000000', golsCasa: 1, golsFora: 0 },
  ],
};

describeSecuritySuite(test, {
  descricao: 'Segurança POST /palpites/lote',
  route: 'palpites/lote',
  method: 'POST',
  basePayload,
  usuario: PALPITE_ATTEMPT_USUARIOS.user,
  seed: seedPalpiteAttempt,

  sqlInjection: {
    campos: ['palpites'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.CREATED],
  },

  stacktrace: {
    payloadQueForcaErro: { palpites: null },
  },
});

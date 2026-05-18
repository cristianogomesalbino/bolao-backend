import {
  test, HTTP,
  describeSecuritySuite, factoryJogo,
  FASE_ATTEMPT_USUARIOS, seedJogoAttemptWithFase,
} from '../../../../resources';

const basePayload = factoryJogo('for_post_jogo');

describeSecuritySuite(test, {
  descricao: 'Segurança POST /fases/:id/jogos',
  route: 'placeholder',
  method: 'POST',
  basePayload,
  usuario: FASE_ATTEMPT_USUARIOS.user,
  seed: seedJogoAttemptWithFase,
  routeResolver: (data) => `fases/${data.faseId}/jogos`,

  sqlInjection: {
    campos: ['timeCasaId', 'timeForaId'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.CREATED, HTTP.NOT_FOUND],
  },

  xss: {
    campos: ['timeCasaId', 'timeForaId'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.CREATED, HTTP.BAD_REQUEST, HTTP.NOT_FOUND],
  },

  stacktrace: {
    payloadQueForcaErro: { timeCasaId: null, timeForaId: null, dataHora: null },
  },
});

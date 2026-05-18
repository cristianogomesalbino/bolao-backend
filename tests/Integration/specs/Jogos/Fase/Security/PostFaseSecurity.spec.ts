import {
  test, HTTP, factoryFase,
  describeSecuritySuite,
  FASE_ATTEMPT_USUARIOS, seedFaseAttemptWithTemporada,
} from '../../../../resources';

const basePayload = factoryFase('for_post_fase_pontos_corridos');

describeSecuritySuite(test, {
  descricao: 'Segurança POST /temporadas/:id/fases',
  route: 'placeholder',
  method: 'POST',
  basePayload,
  usuario: FASE_ATTEMPT_USUARIOS.user,
  seed: seedFaseAttemptWithTemporada,
  routeResolver: (data) => `temporadas/${data.temporadaId}/fases`,

  sqlInjection: {
    campos: ['nome'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.CREATED],
  },

  xss: {
    campos: ['nome'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.CREATED, HTTP.BAD_REQUEST],
  },

  massAssignment: {
    camposSensiveis: { temporadaId: 'hack-id', ativo: false },
    statusEsperado: [HTTP.CREATED, HTTP.UNPROCESSABLE, HTTP.NOT_FOUND],
    validar: () => {},
  },

  stacktrace: {
    payloadQueForcaErro: { nome: null, tipo: null, ordem: null },
  },
});

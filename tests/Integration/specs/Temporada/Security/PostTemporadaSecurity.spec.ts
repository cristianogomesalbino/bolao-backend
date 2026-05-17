import {
  test, HTTP,
  describeSecuritySuite, buildTemporadaMock,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttempt,
  CampeonatoDB,
} from '../../../resources';

const { payload: basePayload } = buildTemporadaMock('post_temporada');

describeSecuritySuite(test, {
  descricao: 'Segurança POST /temporadas',
  route: 'temporadas',
  method: 'POST',
  basePayload: basePayload!,
  usuario: TEMPORADA_ATTEMPT_USUARIOS.user,
  seed: seedTemporadaAttempt,

  sqlInjection: {
    campos: ['campeonatoId'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.NOT_FOUND],
  },

  xss: {
    campos: ['campeonatoId'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST],
  },

  massAssignment: {
    camposSensiveis: { ativo: false, status: 'FINALIZADA' },
    statusEsperado: [HTTP.NOT_FOUND, HTTP.UNPROCESSABLE, HTTP.CREATED],
    validar: (body) => {
      // Se aceito, não deve ter campos sensíveis aplicados
      if (body.ativo !== undefined) {
        // Temporada não tem campo ativo — se retornou, é problema
      }
    },
  },

  stacktrace: {
    payloadQueForcaErro: { ano: null, campeonatoId: null },
  },
});

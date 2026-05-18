import {
  test, HTTP,
  describeSecuritySuite,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttemptWithCampeonato,
} from '../../../resources';

describeSecuritySuite(test, {
  descricao: 'Segurança POST /temporadas',
  route: 'temporadas',
  method: 'POST',
  basePayload: { ano: 2026, campeonatoId: 'placeholder' },
  usuario: TEMPORADA_ATTEMPT_USUARIOS.user,
  seed: async () => {
    const data = await seedTemporadaAttemptWithCampeonato();
    return data;
  },
  routeResolver: () => 'temporadas',

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
      if (body.ativo !== undefined) {
        // Temporada não tem campo ativo
      }
    },
  },

  stacktrace: {
    payloadQueForcaErro: { ano: null, campeonatoId: null },
  },
});

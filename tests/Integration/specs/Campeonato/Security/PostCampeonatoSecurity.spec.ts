import {
  test, expect, HTTP,
  describeSecuritySuite, buildCampeonatoMock,
  CAMPEONATO_ATTEMPT_USUARIOS, seedCampeonatoAttempt,
} from '../../../resources';

const { route, payload: basePayload } = buildCampeonatoMock('post_campeonato');

describeSecuritySuite(test, {
  descricao: 'Segurança POST /campeonatos',
  route,
  method: 'POST',
  basePayload: basePayload!,
  usuario: CAMPEONATO_ATTEMPT_USUARIOS.user,
  seed: seedCampeonatoAttempt,

  sqlInjection: {
    campos: ['nome'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.CREATED],
  },

  xss: {
    campos: ['nome'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.CREATED, HTTP.BAD_REQUEST],
  },

  massAssignment: {
    camposSensiveis: { ativo: false, tipo: 'INTERNACIONAL' },
    statusEsperado: [HTTP.CREATED, HTTP.UNPROCESSABLE],
    validar: (body) => {
      if (body.ativo !== undefined) expect(body.ativo).not.toBe(false);
    },
  },

  stacktrace: {
    payloadQueForcaErro: { nome: null },
  },
});

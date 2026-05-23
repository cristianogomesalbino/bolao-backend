import {
  test, HTTP,
  describeSecuritySuite, factoryPalpite,
  PALPITE_ATTEMPT_USUARIOS, seedPalpiteAttemptWithFase,
} from '../../../../resources';
import * as JogoRoute from '../../../../resources/Routes/JogoRoute';
import { factoryJogo } from '../../../../resources/Fixtures/DataFactories/JogoFactory';

const basePayload = factoryPalpite('for_post_palpite');

describeSecuritySuite(test, {
  descricao: 'Segurança POST /jogos/:id/palpites',
  route: 'placeholder',
  method: 'POST',
  basePayload,
  usuario: PALPITE_ATTEMPT_USUARIOS.user,
  setup: async (request) => {
    const data = await seedPalpiteAttemptWithFase();
    const jogo = factoryJogo('for_post_jogo');
    const response = await JogoRoute.postJogo(request, PALPITE_ATTEMPT_USUARIOS.user, data.faseId, jogo);
    const body = await response.json();
    return { jogoId: body.id };
  },
  routeResolver: (data) => `jogos/${data.jogoId}/palpites`,

  sqlInjection: {
    campos: ['golsCasa', 'golsFora'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST],
  },

  massAssignment: {
    camposSensiveis: { usuarioId: 'a0000000-0000-4000-a000-000000000001', id: 'a0000000-0000-4000-a000-000000000002' },
    statusEsperado: [HTTP.CREATED, HTTP.UNPROCESSABLE],
    validar: (body) => {
      if (body.usuarioId) {
        // Não deve aceitar override do usuarioId
        expect(body.usuarioId).not.toBe('a0000000-0000-4000-a000-000000000001');
      }
    },
  },

  stacktrace: {
    payloadQueForcaErro: { golsCasa: null, golsFora: null },
  },
});

import {
  test, HTTP, INVALID, factoryPalpite,
  describeInvalidFieldSuite,
  PALPITE_ATTEMPT_USUARIOS, seedPalpiteAttemptWithFase,
} from '../../../../resources';
import * as JogoRoute from '../../../../resources/Routes/JogoRoute';
import { factoryJogo } from '../../../../resources/Fixtures/DataFactories/JogoFactory';

const basePayload = factoryPalpite('for_post_palpite');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /jogos/:id/palpites - Campos Inválidos',
  route: 'placeholder',
  usuario: PALPITE_ATTEMPT_USUARIOS.user,
  basePayload,
  seed: async () => {
    const data = await seedPalpiteAttemptWithFase();
    return data;
  },
  setup: async (request) => {
    const data = await seedPalpiteAttemptWithFase();
    const jogo = factoryJogo('for_post_jogo');
    const response = await JogoRoute.postJogo(request, PALPITE_ATTEMPT_USUARIOS.user, data.faseId, jogo);
    const body = await response.json();
    return { jogoId: body.id };
  },
  routeResolver: (data) => `jogos/${data.jogoId}/palpites`,
  // prettier-ignore
  scenarios: [
    ['golsCasa',    INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'golsCasa deve ser no mínimo 0'],
    ['golsCasa',    INVALID.NULL,           HTTP.UNPROCESSABLE, 'golsCasa deve ser no mínimo 0'],
    ['golsCasa',    INVALID.STRING,         HTTP.UNPROCESSABLE, 'golsCasa deve ser no mínimo 0'],
    ['golsCasa',    -1,                     HTTP.UNPROCESSABLE, 'golsCasa deve ser no mínimo 0'],
    ['golsFora',    INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'golsFora deve ser no mínimo 0'],
    ['golsFora',    INVALID.NULL,           HTTP.UNPROCESSABLE, 'golsFora deve ser no mínimo 0'],
    ['golsFora',    INVALID.STRING,         HTTP.UNPROCESSABLE, 'golsFora deve ser no mínimo 0'],
    ['golsFora',    -1,                     HTTP.UNPROCESSABLE, 'golsFora deve ser no mínimo 0'],
  ],
});

import {
  test, HTTP, INVALID, factoryPalpite,
  describeAttemptSuite,
  PALPITE_ATTEMPT_USUARIOS, seedPalpiteAttemptWithFase,
} from '../../../../resources';
import * as JogoRoute from '../../../../resources/Routes/JogoRoute';
import { factoryJogo } from '../../../../resources/Fixtures/DataFactories/JogoFactory';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /jogos/:id/palpites',
  usuarios: PALPITE_ATTEMPT_USUARIOS,
  seed: seedPalpiteAttemptWithFase,
  setup: async (request) => {
    const data = await seedPalpiteAttemptWithFase();
    const jogo = factoryJogo('for_post_jogo');
    const response = await JogoRoute.postJogo(request, PALPITE_ATTEMPT_USUARIOS.user, data.faseId, jogo);
    const body = await response.json();
    return { jogoId: body.id };
  },
  routeResolver: (data) => `jogos/${data.jogoId}/palpites`,
  payloadResolver: () => factoryPalpite('for_post_palpite'),
  // prettier-ignore
  scenarios: [
    ['sem_token',     'POST',   HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'POST',   HTTP.CREATED,            'criando palpite'],
    ['super_admin',   'POST',   HTTP.CREATED,            'admin criando palpite'],
  ],
});

import {
  test, HTTP,
  describeAttemptSuite,
  PALPITE_ATTEMPT_USUARIOS, seedPalpiteAttemptWithFase,
} from '../../../../resources';
import * as JogoRoute from '../../../../resources/Routes/JogoRoute';
import { factoryJogo } from '../../../../resources/Fixtures/DataFactories/JogoFactory';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /jogos/:id/meu-palpite',
  usuarios: PALPITE_ATTEMPT_USUARIOS,
  seed: seedPalpiteAttemptWithFase,
  setup: async (request) => {
    const data = await seedPalpiteAttemptWithFase();
    const jogo = factoryJogo('for_post_jogo');
    const response = await JogoRoute.postJogo(request, PALPITE_ATTEMPT_USUARIOS.user, data.faseId, jogo);
    const body = await response.json();
    return { jogoId: body.id };
  },
  routeResolver: (data) => `jogos/${data.jogoId}/meu-palpite`,
  // prettier-ignore
  scenarios: [
    ['sem_token',     'GET',    HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'GET',    HTTP.NOT_FOUND,          'sem palpite cadastrado'],
    ['super_admin',   'GET',    HTTP.NOT_FOUND,          'admin sem palpite'],
  ],
});

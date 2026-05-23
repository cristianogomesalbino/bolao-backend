import {
  test, HTTP, factoryPalpite,
  describeAttemptSuite,
  PALPITE_ATTEMPT_USUARIOS, seedPalpiteAttemptWithFase,
} from '../../../../resources';
import * as JogoRoute from '../../../../resources/Routes/JogoRoute';
import * as PalpiteRoute from '../../../../resources/Routes/PalpiteRoute';
import { factoryJogo } from '../../../../resources/Fixtures/DataFactories/JogoFactory';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /palpites/:id',
  usuarios: PALPITE_ATTEMPT_USUARIOS,
  seed: seedPalpiteAttemptWithFase,
  setup: async (request) => {
    const data = await seedPalpiteAttemptWithFase();
    const jogo = factoryJogo('for_post_jogo');
    const jogoResponse = await JogoRoute.postJogo(request, PALPITE_ATTEMPT_USUARIOS.user, data.faseId, jogo);
    const jogoBody = await jogoResponse.json();

    // Cria palpite para poder editar
    const palpite = factoryPalpite('for_post_palpite');
    const palpiteResponse = await PalpiteRoute.postPalpite(request, PALPITE_ATTEMPT_USUARIOS.user, jogoBody.id, palpite);
    const palpiteBody = await palpiteResponse.json();

    return { palpiteId: palpiteBody.id };
  },
  routeResolver: (data) => `palpites/${data.palpiteId}`,
  payloadResolver: () => factoryPalpite('for_patch_palpite'),
  // prettier-ignore
  scenarios: [
    ['sem_token',     'PATCH',  HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'PATCH',  HTTP.OK,                 'dono editando palpite'],
    ['super_admin',   'PATCH',  HTTP.FORBIDDEN,          'outro usuário tentando editar', 'Backend retorna 404 em vez de 403'],
  ],
});

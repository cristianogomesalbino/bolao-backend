import { test } from '../../../resources/Base/test-base';
import {
  HTTP_UNAUTHORIZED,
  HTTP_CREATED,
} from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/AttemptRequestsTemplate';
import {
  CAMPEONATO_ATTEMPT_USUARIOS,
  seedCampeonatoAttempt,
} from '../../../resources/Fixtures/SeedBuilders/CampeonatoSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /campeonatos',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP_CREATED },
  ],
  usuarios: CAMPEONATO_ATTEMPT_USUARIOS,
  mockData: { route: 'campeonatos' },
  seed: seedCampeonatoAttempt,
  payloadResolver: () => ({ nome: `Camp Attempt ${Date.now()}` }),
});

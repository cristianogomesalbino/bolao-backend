import { test } from '../../../resources/Base/test-base';
import { HTTP_UNAUTHORIZED, HTTP_OK } from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/PermissionTemplate';
import { buildCampeonatoMock } from '../../../resources/Fixtures/MockDataBuilders/CampeonatoMockDataBuilder';
import {
  CAMPEONATO_ATTEMPT_USUARIOS,
  seedCampeonatoAttempt,
} from '../../../resources/Fixtures/SeedBuilders/CampeonatoSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /campeonatos',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP_OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP_OK },
  ],
  usuarios: CAMPEONATO_ATTEMPT_USUARIOS,
  mockData: buildCampeonatoMock('get_campeonatos'),
  seed: seedCampeonatoAttempt,
});

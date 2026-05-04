import { test } from '../../../resources/Base/test-base';
import { HTTP_UNAUTHORIZED, HTTP_OK } from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/AttemptRequestsTemplate';
import {
  TEMPORADA_ATTEMPT_USUARIOS,
  seedTemporadaAttempt,
} from '../../../resources/Fixtures/SeedBuilders/TemporadaSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /temporadas',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP_OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP_OK },
  ],
  usuarios: TEMPORADA_ATTEMPT_USUARIOS,
  mockData: { route: 'temporadas' },
  seed: seedTemporadaAttempt,
});

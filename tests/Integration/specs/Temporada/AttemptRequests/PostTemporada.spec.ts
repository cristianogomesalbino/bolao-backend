import { test } from '../../../resources/Base/test-base';
import {
  HTTP_UNAUTHORIZED,
  HTTP_BAD_REQUEST,
  UUID_INEXISTENTE,
} from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/AttemptRequestsTemplate';
import {
  TEMPORADA_ATTEMPT_USUARIOS,
  seedTemporadaAttempt,
} from '../../../resources/Fixtures/SeedBuilders/TemporadaSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /temporadas',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP_BAD_REQUEST },
    {
      perfil: 'super_admin',
      method: 'POST',
      statusEsperado: HTTP_BAD_REQUEST,
    },
  ],
  usuarios: TEMPORADA_ATTEMPT_USUARIOS,
  mockData: {
    route: 'temporadas',
    payload: { ano: 2026, campeonatoId: UUID_INEXISTENTE },
  },
  seed: seedTemporadaAttempt,
});

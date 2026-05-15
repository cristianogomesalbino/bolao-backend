import { test } from '../../../resources/Base/test-base';
import { HTTP_UNAUTHORIZED, HTTP_OK } from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/PermissionTemplate';
import {
  GRUPO_SIMPLE_ATTEMPT_USUARIOS,
  seedGrupoSimpleAttempt,
} from '../../../resources/Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /grupos',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP_OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP_OK },
  ],
  usuarios: GRUPO_SIMPLE_ATTEMPT_USUARIOS,
  mockData: { route: 'grupos' },
  seed: seedGrupoSimpleAttempt,
});

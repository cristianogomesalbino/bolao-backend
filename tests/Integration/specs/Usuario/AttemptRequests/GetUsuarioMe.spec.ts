import { test } from '../../../resources/Base/test-base';
import { HTTP_UNAUTHORIZED, HTTP_OK } from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/AttemptRequestsTemplate';
import { buildUsuarioMock } from '../../../resources/Fixtures/MockDataBuilders/UsuarioMockDataBuilder';
import {
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
} from '../../../resources/Fixtures/SeedBuilders/UsuarioSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /usuarios/me',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'user', method: 'GET', statusEsperado: HTTP_OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP_OK },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  mockData: buildUsuarioMock('get_usuario_me'),
  seed: seedUsuarioAttempt,
});

import { test } from '../../../resources/Base/test-base';
import { HTTP_CREATED } from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/AttemptRequestsTemplate';
import { buildUsuarioMock } from '../../../resources/Fixtures/MockDataBuilders/UsuarioMockDataBuilder';
import {
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
} from '../../../resources/Fixtures/SeedBuilders/UsuarioSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /usuarios',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP_CREATED },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  mockData: buildUsuarioMock('post_usuario'),
  seed: seedUsuarioAttempt,
  payloadResolver: () => ({
    nome: 'Attempt User QA',
    email: `attempt.${Date.now()}@teste.qa`,
    senha: 'Teste123!',
  }),
});

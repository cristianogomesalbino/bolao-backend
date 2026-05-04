import { test } from '../../../resources/Base/test-base';
import {
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
} from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/AttemptRequestsTemplate';
import { setupGrupoComMembros } from '../../../resources/Fixtures/SeedBuilders/GrupoAttemptSetup';
import {
  GRUPO_ATTEMPT_USUARIOS,
  seedGrupoAttempt,
} from '../../../resources/Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /grupos/:id/adicionar',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'membro_grupo', method: 'POST', statusEsperado: HTTP_FORBIDDEN },
    { perfil: 'user_fora', method: 'POST', statusEsperado: HTTP_FORBIDDEN },
    { perfil: 'admin_grupo', method: 'POST', statusEsperado: HTTP_NOT_FOUND },
  ],
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'AdicionarAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/adicionar`,
  payloadResolver: () => ({ email: 'naoexiste@attempt.qa' }),
});

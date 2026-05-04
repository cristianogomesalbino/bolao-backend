import { test } from '../../../resources/Base/test-base';
import {
  HTTP_UNAUTHORIZED,
  HTTP_OK,
  HTTP_FORBIDDEN,
} from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/AttemptRequestsTemplate';
import { setupGrupoComMembros } from '../../../resources/Fixtures/SeedBuilders/GrupoAttemptSetup';
import {
  GRUPO_ATTEMPT_USUARIOS,
  seedGrupoAttempt,
} from '../../../resources/Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /grupos/:id/membros',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'admin_grupo', method: 'GET', statusEsperado: HTTP_OK },
    { perfil: 'membro_grupo', method: 'GET', statusEsperado: HTTP_OK },
    { perfil: 'user_fora', method: 'GET', statusEsperado: HTTP_FORBIDDEN },
  ],
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'MembrosAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/membros`,
});

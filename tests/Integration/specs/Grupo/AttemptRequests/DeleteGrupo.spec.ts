import { test } from '../../../resources/Base/test-base';
import {
  HTTP_UNAUTHORIZED,
  HTTP_FORBIDDEN,
  HTTP_BAD_REQUEST,
} from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/PermissionTemplate';
import { setupGrupoComMembros } from '../../../resources/Fixtures/SeedBuilders/GrupoAttemptSetup';
import {
  GRUPO_ATTEMPT_USUARIOS,
  seedGrupoAttempt,
} from '../../../resources/Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt DELETE /grupos/:id',
  scenarios: [
    {
      perfil: 'sem_token',
      method: 'DELETE',
      statusEsperado: HTTP_UNAUTHORIZED,
    },
    {
      perfil: 'membro_grupo',
      method: 'DELETE',
      statusEsperado: HTTP_FORBIDDEN,
    },
    { perfil: 'user_fora', method: 'DELETE', statusEsperado: HTTP_FORBIDDEN },
    {
      perfil: 'admin_grupo',
      method: 'DELETE',
      statusEsperado: HTTP_BAD_REQUEST,
    },
  ],
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'DeleteAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}`,
});

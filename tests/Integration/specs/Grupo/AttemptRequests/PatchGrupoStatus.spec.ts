import { test } from '../../../resources/Base/test-base';
import {
  HTTP_UNAUTHORIZED,
  HTTP_OK,
  HTTP_FORBIDDEN,
} from '../../../resources/Base/constants';
import { describeAttemptSuite } from '../../../resources/Templates/PermissionTemplate';
import { setupGrupoComMembros } from '../../../resources/Fixtures/SeedBuilders/GrupoAttemptSetup';
import {
  GRUPO_ATTEMPT_USUARIOS,
  seedGrupoAttempt,
} from '../../../resources/Fixtures/SeedBuilders/GrupoSuiteSeedBuilder';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /grupos/:id/status',
  scenarios: [
    { perfil: 'sem_token', method: 'PATCH', statusEsperado: HTTP_UNAUTHORIZED },
    { perfil: 'admin_grupo', method: 'PATCH', statusEsperado: HTTP_OK },
    { perfil: 'membro_grupo', method: 'PATCH', statusEsperado: HTTP_FORBIDDEN },
    { perfil: 'user_fora', method: 'PATCH', statusEsperado: HTTP_FORBIDDEN },
  ],
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'StatusAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/status`,
  payloadResolver: () => ({ ativo: true }),
});

import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt DELETE /grupos/:id',
  scenarios: [
    { perfil: 'sem_token', method: 'DELETE', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'membro_grupo', method: 'DELETE', statusEsperado: HTTP.FORBIDDEN },
    { perfil: 'user_fora', method: 'DELETE', statusEsperado: HTTP.FORBIDDEN },
    { perfil: 'admin_grupo', method: 'DELETE', statusEsperado: HTTP.BAD_REQUEST },
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

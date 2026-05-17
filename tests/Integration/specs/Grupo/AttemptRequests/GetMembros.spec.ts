import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /grupos/:id/membros',
  scenarios: [
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'admin_grupo', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'membro_grupo', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'user_fora', method: 'GET', statusEsperado: HTTP.FORBIDDEN },
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

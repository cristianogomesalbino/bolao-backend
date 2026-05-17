import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /grupos/:id/status',
  scenarios: [
    { perfil: 'sem_token', method: 'PATCH', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'admin_grupo', method: 'PATCH', statusEsperado: HTTP.OK },
    { perfil: 'membro_grupo', method: 'PATCH', statusEsperado: HTTP.FORBIDDEN },
    { perfil: 'user_fora', method: 'PATCH', statusEsperado: HTTP.FORBIDDEN },
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

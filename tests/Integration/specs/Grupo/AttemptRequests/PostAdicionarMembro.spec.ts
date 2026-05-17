import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /grupos/:id/adicionar',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'membro_grupo', method: 'POST', statusEsperado: HTTP.FORBIDDEN },
    { perfil: 'user_fora', method: 'POST', statusEsperado: HTTP.FORBIDDEN },
    { perfil: 'admin_grupo', method: 'POST', statusEsperado: HTTP.NOT_FOUND },
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

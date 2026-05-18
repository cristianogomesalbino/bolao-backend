import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /grupos/:id/tokens-dobro/saldo',
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'SaldoAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/tokens-dobro/saldo`,
  // prettier-ignore
  scenarios: [
    ['sem_token',      'GET',  HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['admin_grupo',    'GET',  HTTP.OK,            'admin consultando saldo'],
    ['membro_grupo',   'GET',  HTTP.OK,            'membro consultando saldo'],
    ['user_fora',      'GET',  HTTP.FORBIDDEN,     'usuário fora do grupo'],
  ],
});

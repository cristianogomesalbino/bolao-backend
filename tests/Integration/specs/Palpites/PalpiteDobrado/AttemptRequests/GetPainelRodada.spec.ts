import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /grupos/:id/painel-rodada/:faseId',
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: async (request) => {
    const data = await setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'PainelAttempt',
    );
    return data;
  },
  routeResolver: (data) => `grupos/${data.grupoId}/painel-rodada/${data.faseId}`,
  // prettier-ignore
  scenarios: [
    ['sem_token',      'GET',  HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['admin_grupo',    'GET',  HTTP.OK,            'admin consultando painel'],
    ['membro_grupo',   'GET',  HTTP.OK,            'membro consultando painel'],
    ['user_fora',      'GET',  HTTP.FORBIDDEN,     'usuário fora do grupo'],
  ],
});

import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /grupos/:id',
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'PatchAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}`,
  payloadResolver: () => ({ nome: `Attempt Patch ${Date.now()}` }),
  // prettier-ignore
  scenarios: [
    // [perfil,        method,   status,             descricao]
    ['sem_token',      'PATCH',  HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['admin_grupo',    'PATCH',  HTTP.OK,            'admin atualizando grupo'],
    ['membro_grupo',   'PATCH',  HTTP.FORBIDDEN,     'membro sem permissão'],
    ['user_fora',      'PATCH',  HTTP.FORBIDDEN,     'usuário fora do grupo'],
  ],
});

import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /grupos/:id/status',
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
  // prettier-ignore
  scenarios: [
    // [perfil,        method,   status,             descricao]
    ['sem_token',      'PATCH',  HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['admin_grupo',    'PATCH',  HTTP.OK,            'admin alterando status'],
    ['membro_grupo',   'PATCH',  HTTP.FORBIDDEN,     'membro sem permissão'],
    ['user_fora',      'PATCH',  HTTP.FORBIDDEN,     'usuário fora do grupo'],
  ],
});

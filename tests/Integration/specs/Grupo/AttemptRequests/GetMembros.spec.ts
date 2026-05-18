import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /grupos/:id/membros',
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
  // prettier-ignore
  scenarios: [
    // [perfil,        method, status,             descricao]
    ['sem_token',      'GET',  HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['admin_grupo',    'GET',  HTTP.OK,            'admin listando membros'],
    ['membro_grupo',   'GET',  HTTP.OK,            'membro listando membros'],
    ['user_fora',      'GET',  HTTP.FORBIDDEN,     'usuário fora do grupo'],
  ],
});

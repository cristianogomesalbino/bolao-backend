import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt DELETE /grupos/:id',
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
  // prettier-ignore
  scenarios: [
    // [perfil,        method,   status,             descricao]
    ['sem_token',      'DELETE', HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['membro_grupo',   'DELETE', HTTP.FORBIDDEN,     'membro sem permissão'],
    ['user_fora',      'DELETE', HTTP.FORBIDDEN,     'usuário fora do grupo'],
    ['admin_grupo',    'DELETE', HTTP.BAD_REQUEST,   'grupo ativo — deve desativar antes'],
  ],
});

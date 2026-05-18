import {
  test, HTTP, INVALID,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt DELETE /grupos/:id/sair',
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'SairAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/sair`,
  // prettier-ignore
  scenarios: [
    // [perfil,        method,   status,             descricao]
    ['sem_token',      'DELETE', HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['membro_grupo',   'DELETE', HTTP.OK,            'membro sai do grupo'],
    ['user_fora',      'DELETE', HTTP.NOT_FOUND,     'usuário fora do grupo'],
  ],
});

import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /grupos/:id/regenerar-convite',
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'RegenerarAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/regenerar-convite`,
  // prettier-ignore
  scenarios: [
    ['sem_token',      'PATCH',  HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['admin_grupo',    'PATCH',  HTTP.OK,            'admin regenerando convite'],
    ['membro_grupo',   'PATCH',  HTTP.FORBIDDEN,     'membro tentando regenerar'],
    ['user_fora',      'PATCH',  HTTP.FORBIDDEN,     'usuário fora do grupo'],
  ],
});

import {
  test, HTTP,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /grupos/:id/adicionar',
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
  // prettier-ignore
  scenarios: [
    // [perfil,        method,  status,             descricao]
    ['sem_token',      'POST',  HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['membro_grupo',   'POST',  HTTP.FORBIDDEN,     'membro sem permissão'],
    ['user_fora',      'POST',  HTTP.FORBIDDEN,     'usuário fora do grupo'],
    ['admin_grupo',    'POST',  HTTP.NOT_FOUND,     'email inexistente retorna 404'],
  ],
});

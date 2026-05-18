import {
  test, HTTP, factoryConfigurarDobro,
  describeAttemptSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /grupos/:id/configuracao-dobro',
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'ConfigDobroAttempt',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/configuracao-dobro`,
  payloadResolver: () => factoryConfigurarDobro('habilitar'),
  // prettier-ignore
  scenarios: [
    ['sem_token',      'PATCH', HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['admin_grupo',    'PATCH', HTTP.OK,            'admin configurando dobro'],
    ['membro_grupo',   'PATCH', HTTP.FORBIDDEN,     'membro sem permissão'],
    ['user_fora',      'PATCH', HTTP.FORBIDDEN,     'usuário fora do grupo'],
  ],
});

import {
  test, HTTP,
  describeSecuritySuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeSecuritySuite(test, {
  descricao: 'Segurança POST /grupos/:id/adicionar',
  route: 'placeholder',
  method: 'POST',
  basePayload: { email: 'security@teste.qa' },
  usuario: GRUPO_ATTEMPT_USUARIOS.admin_grupo,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'SecurityAdicionar',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/adicionar`,

  sqlInjection: {
    campos: ['email'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.NOT_FOUND],
  },

  xss: {
    campos: ['email'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.NOT_FOUND],
  },

  stacktrace: {
    payloadQueForcaErro: { email: null },
  },
});

import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../resources';

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /grupos/:id/adicionar - Campos Inválidos',
  route: 'placeholder',
  usuario: GRUPO_ATTEMPT_USUARIOS.admin_grupo,
  basePayload: { email: 'valido@teste.qa' },
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'InvalidFieldsAdicionar',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/adicionar`,
  // prettier-ignore
  scenarios: [
    // [campo,   valor,           status,             mensagem]
    ['email',    INVALID.EMPTY,   HTTP.UNPROCESSABLE, 'email deve ser um endereço de email válido'],
    ['email',    INVALID.NULL,    HTTP.UNPROCESSABLE, 'email deve ser um endereço de email válido'],
    ['email',    INVALID.EMAIL,   HTTP.UNPROCESSABLE, 'email deve ser um endereço de email válido'],
    ['email',    INVALID.MAX_INT, HTTP.UNPROCESSABLE, 'email deve ser um endereço de email válido'],
  ],
});

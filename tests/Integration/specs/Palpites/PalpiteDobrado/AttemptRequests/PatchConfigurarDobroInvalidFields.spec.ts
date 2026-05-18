import {
  test, HTTP, INVALID, factoryConfigurarDobro,
  describeInvalidFieldSuite, setupGrupoComMembros,
  GRUPO_ATTEMPT_USUARIOS, seedGrupoAttempt,
} from '../../../../resources';

const basePayload = factoryConfigurarDobro('habilitar');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt PATCH /grupos/:id/configuracao-dobro - Campos Inválidos',
  route: 'placeholder',
  usuario: GRUPO_ATTEMPT_USUARIOS.admin_grupo,
  basePayload,
  seed: seedGrupoAttempt,
  setup: (request) =>
    setupGrupoComMembros(
      request,
      GRUPO_ATTEMPT_USUARIOS.admin_grupo,
      GRUPO_ATTEMPT_USUARIOS.membro_grupo,
      'ConfigDobroInvalid',
    ),
  routeResolver: (data) => `grupos/${data.grupoId}/configuracao-dobro`,
  // prettier-ignore
  scenarios: [
    ['permitirPalpiteDobrado',    INVALID.NULL,       HTTP.UNPROCESSABLE, 'permitirPalpiteDobrado é obrigatório'],
    ['permitirPalpiteDobrado',    INVALID.STRING,     HTTP.UNPROCESSABLE, 'permitirPalpiteDobrado deve ser verdadeiro ou falso'],
    ['permitirPalpiteDobrado',    INVALID.MAX_INT,    HTTP.UNPROCESSABLE, 'permitirPalpiteDobrado deve ser verdadeiro ou falso'],
  ],
});

import {
  test, HTTP,
  describeAttemptSuite,
  FASE_ATTEMPT_USUARIOS, seedFaseAttemptWithTemporada,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /temporadas/:id/fases',
  usuarios: FASE_ATTEMPT_USUARIOS,
  seed: seedFaseAttemptWithTemporada,
  routeResolver: (data) => `temporadas/${data.temporadaId}/fases`,
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                          skip?]
    ['sem_token',     'GET',    HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'GET',    HTTP.OK,                 'listando fases'],
    ['super_admin',   'GET',    HTTP.OK,                 'admin listando fases'],
  ],
});

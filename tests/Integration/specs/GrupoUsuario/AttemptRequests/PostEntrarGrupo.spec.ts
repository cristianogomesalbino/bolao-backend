import {
  test, HTTP,
  describeAttemptSuite,
  GRUPO_SIMPLE_ATTEMPT_USUARIOS, seedGrupoSimpleAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /grupos/entrar',
  usuarios: GRUPO_SIMPLE_ATTEMPT_USUARIOS,
  mockData: { route: 'grupos/entrar', payload: { codigoConvite: 'INVALIDO' } },
  seed: seedGrupoSimpleAttempt,
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao]
    ['sem_token',     'POST',   HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'POST',   HTTP.NOT_FOUND,          'código inexistente retorna 404'],
    ['super_admin',   'POST',   HTTP.NOT_FOUND,          'admin com código inexistente retorna 404'],
  ],
});

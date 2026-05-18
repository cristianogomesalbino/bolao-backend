import {
  test, HTTP,
  describeAttemptSuite,
  GRUPO_SIMPLE_ATTEMPT_USUARIOS, seedGrupoSimpleAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /grupos',
  usuarios: GRUPO_SIMPLE_ATTEMPT_USUARIOS,
  mockData: { route: 'grupos' },
  seed: seedGrupoSimpleAttempt,
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                          skip?]
    ['sem_token',     'GET',    HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'GET',    HTTP.OK,                 'listando grupos'],
    ['super_admin',   'GET',    HTTP.OK,                 'admin listando grupos'],
    // Método não suportado
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',       'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',         'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',      'Backend retorna 404 em vez de 405'],
  ],
});

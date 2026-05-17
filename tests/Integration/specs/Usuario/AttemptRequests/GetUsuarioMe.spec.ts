import {
  test, HTTP,
  describeAttemptSuite, buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /usuarios/me',
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  mockData: buildUsuarioMock('get_usuario_me'),
  seed: seedUsuarioAttempt,
  // prettier-ignore
  scenarios: [
    // [perfil,          method,   status,                  descricao,                          skip?]
    ['sem_token',        'GET',    HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['usuario_comum',    'GET',    HTTP.OK,                 'buscando próprio perfil'],
    ['super_admin',      'GET',    HTTP.OK,                 'admin buscando próprio perfil'],
    // Método não suportado
    ['usuario_comum',    'POST',   HTTP.METHOD_NOT_ALLOWED, 'método POST não suportado',       'Backend retorna 404 em vez de 405'],
    ['usuario_comum',    'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',      'Backend retorna 404 em vez de 405'],
    ['usuario_comum',    'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',     'Backend retorna 404 em vez de 405'],
  ],
});

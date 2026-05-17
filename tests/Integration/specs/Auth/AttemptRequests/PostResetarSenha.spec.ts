import {
  test, HTTP,
  describeAttemptSuite, buildAuthMock,
  AUTH_ATTEMPT_USUARIOS, seedAuthAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /auth/resetar-senha',
  usuarios: AUTH_ATTEMPT_USUARIOS,
  mockData: buildAuthMock('post_resetar_senha'),
  seed: seedAuthAttempt,
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                                    skip?]
    ['sem_token',     'POST',   HTTP.BAD_REQUEST,        'rota pública — token inválido retorna erro'],
    ['user',          'POST',   HTTP.BAD_REQUEST,        'autenticado — token inválido retorna erro'],
    ['super_admin',   'POST',   HTTP.BAD_REQUEST,        'admin — token inválido retorna erro'],
    // Método não suportado
    ['user',          'GET',    HTTP.METHOD_NOT_ALLOWED, 'método GET não suportado',                   'Backend retorna 404 em vez de 405'],
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',                 'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',                   'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',                'Backend retorna 404 em vez de 405'],
  ],
});

import {
  test, HTTP,
  describeAttemptSuite, buildAuthMock,
  AUTH_ATTEMPT_USUARIOS, seedAuthAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /auth/esqueci-senha',
  usuarios: AUTH_ATTEMPT_USUARIOS,
  mockData: buildAuthMock('post_esqueci_senha'),
  seed: seedAuthAttempt,
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                          skip?]
    ['sem_token',     'POST',   HTTP.CREATED,            'rota pública aceita sem token'],
    ['user',          'POST',   HTTP.CREATED,            'rota pública aceita autenticado'],
    ['super_admin',   'POST',   HTTP.CREATED,            'rota pública aceita admin'],
    // Método não suportado
    ['user',          'GET',    HTTP.METHOD_NOT_ALLOWED, 'método GET não suportado',         'Backend retorna 404 em vez de 405'],
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',       'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',         'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',      'Backend retorna 404 em vez de 405'],
  ],
});

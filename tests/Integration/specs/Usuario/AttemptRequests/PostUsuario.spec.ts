import {
  test, HTTP,
  describeAttemptSuite, buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /usuarios',
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  mockData: buildUsuarioMock('post_usuario'),
  seed: seedUsuarioAttempt,
  payloadResolver: () => ({
    ...buildUsuarioMock('post_usuario').payload,
    email: `attempt.${Date.now()}@teste.qa`,
  }),
  // prettier-ignore
  scenarios: [
    // [perfil,          method,   status,                  descricao,                         skip?]
    ['sem_token',        'POST',   HTTP.CREATED,            'rota pública aceita sem token'],
    ['usuario_comum',    'POST',   HTTP.CREATED,            'rota pública aceita autenticado'],
    ['super_admin',      'POST',   HTTP.CREATED,            'rota pública aceita admin'],
    // Método não suportado
    ['usuario_comum',    'GET',    HTTP.METHOD_NOT_ALLOWED, 'método GET não suportado',        'Backend retorna 404 em vez de 405'],
    ['usuario_comum',    'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',      'Backend retorna 404 em vez de 405'],
    ['usuario_comum',    'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',        'Backend retorna 404 em vez de 405'],
    ['usuario_comum',    'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',     'Backend retorna 404 em vez de 405'],
  ],
});

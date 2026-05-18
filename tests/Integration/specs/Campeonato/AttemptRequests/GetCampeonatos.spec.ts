import {
  test, HTTP,
  describeAttemptSuite, buildCampeonatoMock,
  CAMPEONATO_ATTEMPT_USUARIOS, seedCampeonatoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /campeonatos',
  usuarios: CAMPEONATO_ATTEMPT_USUARIOS,
  mockData: buildCampeonatoMock('get_campeonatos'),
  seed: seedCampeonatoAttempt,
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                          skip?]
    ['sem_token',     'GET',    HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'GET',    HTTP.OK,                 'listando campeonatos'],
    ['super_admin',   'GET',    HTTP.OK,                 'admin listando campeonatos'],
    // Método não suportado
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',       'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',         'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',      'Backend retorna 404 em vez de 405'],
  ],
});

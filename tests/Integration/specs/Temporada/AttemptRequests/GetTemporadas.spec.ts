import {
  test, HTTP,
  describeAttemptSuite, buildTemporadaMock,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /temporadas',
  usuarios: TEMPORADA_ATTEMPT_USUARIOS,
  mockData: buildTemporadaMock('get_temporadas'),
  seed: seedTemporadaAttempt,
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                          skip?]
    ['sem_token',     'GET',    HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'GET',    HTTP.OK,                 'listando temporadas'],
    ['super_admin',   'GET',    HTTP.OK,                 'admin listando temporadas'],
    // Método não suportado
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',       'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',         'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',      'Backend retorna 404 em vez de 405'],
  ],
});

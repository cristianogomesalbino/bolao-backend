import {
  test, HTTP,
  describeAttemptSuite, buildTemporadaMock,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /temporadas',
  usuarios: TEMPORADA_ATTEMPT_USUARIOS,
  mockData: buildTemporadaMock('post_temporada'),
  seed: seedTemporadaAttempt,
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                                    skip?]
    ['sem_token',     'POST',   HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'POST',   HTTP.NOT_FOUND,          'campeonato inexistente retorna 404'],
    ['super_admin',   'POST',   HTTP.NOT_FOUND,          'admin — campeonato inexistente retorna 404'],
    // Método não suportado
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',                 'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',                   'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',                'Backend retorna 404 em vez de 405'],
  ],
});

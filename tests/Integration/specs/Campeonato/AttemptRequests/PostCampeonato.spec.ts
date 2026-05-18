import {
  test, HTTP,
  describeAttemptSuite, buildCampeonatoMock,
  CAMPEONATO_ATTEMPT_USUARIOS, seedCampeonatoAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /campeonatos',
  usuarios: CAMPEONATO_ATTEMPT_USUARIOS,
  mockData: buildCampeonatoMock('post_campeonato'),
  seed: seedCampeonatoAttempt,
  payloadResolver: () => ({ nome: `Camp Attempt ${Date.now()}` }),
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                          skip?]
    ['sem_token',     'POST',   HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'POST',   HTTP.CREATED,            'criando campeonato'],
    ['super_admin',   'POST',   HTTP.CREATED,            'admin criando campeonato'],
    // Método não suportado
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',       'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',         'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',      'Backend retorna 404 em vez de 405'],
  ],
});

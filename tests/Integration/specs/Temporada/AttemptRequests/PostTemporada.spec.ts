import {
  test, HTTP,
  describeAttemptSuite, buildTemporadaMock,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttemptWithCampeonato,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /temporadas',
  usuarios: TEMPORADA_ATTEMPT_USUARIOS,
  seed: seedTemporadaAttemptWithCampeonato,
  routeResolver: () => 'temporadas',
  payloadResolver: (data) => ({ ano: 2026, campeonatoId: data.campeonatoId }),
  // prettier-ignore
  scenarios: [
    // [perfil,       method,   status,                  descricao,                                    skip?]
    ['sem_token',     'POST',   HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'POST',   HTTP.CREATED,            'criando temporada com campeonato válido'],
    ['super_admin',   'POST',   HTTP.CREATED,            'admin criando temporada'],
    // Método não suportado
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',                 'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',                   'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',                'Backend retorna 404 em vez de 405'],
  ],
});

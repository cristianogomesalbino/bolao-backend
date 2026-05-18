import {
  test, HTTP, factoryFase,
  describeAttemptSuite,
  FASE_ATTEMPT_USUARIOS, seedFaseAttemptWithTemporada,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /temporadas/:id/fases',
  usuarios: FASE_ATTEMPT_USUARIOS,
  seed: seedFaseAttemptWithTemporada,
  routeResolver: (data) => `temporadas/${data.temporadaId}/fases`,
  payloadResolver: () => factoryFase('for_post_fase_pontos_corridos'),
  // prettier-ignore
  scenarios: [
    ['sem_token',     'POST',   HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'POST',   HTTP.CREATED,            'criando fase'],
    ['super_admin',   'POST',   HTTP.CREATED,            'admin criando fase'],
    // Método não suportado
    ['user',          'PATCH',  HTTP.METHOD_NOT_ALLOWED, 'método PATCH não suportado',       'Backend retorna 404 em vez de 405'],
    ['user',          'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',         'Backend retorna 404 em vez de 405'],
    ['user',          'DELETE', HTTP.METHOD_NOT_ALLOWED, 'método DELETE não suportado',      'Backend retorna 404 em vez de 405'],
  ],
});

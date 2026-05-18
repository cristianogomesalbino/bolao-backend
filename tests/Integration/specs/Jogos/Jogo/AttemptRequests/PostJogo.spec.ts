import {
  test, HTTP,
  describeAttemptSuite, factoryJogo,
  FASE_ATTEMPT_USUARIOS, seedJogoAttemptWithFase,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /fases/:id/jogos',
  usuarios: FASE_ATTEMPT_USUARIOS,
  seed: seedJogoAttemptWithFase,
  routeResolver: (data) => `fases/${data.faseId}/jogos`,
  payloadResolver: () => factoryJogo('for_post_jogo'),
  // prettier-ignore
  scenarios: [
    ['sem_token',     'POST',   HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'POST',   HTTP.CREATED,            'criando jogo'],
    ['super_admin',   'POST',   HTTP.CREATED,            'admin criando jogo'],
  ],
});

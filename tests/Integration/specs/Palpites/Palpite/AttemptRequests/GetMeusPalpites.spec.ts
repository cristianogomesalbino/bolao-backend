import {
  test, HTTP,
  describeAttemptSuite,
  PALPITE_ATTEMPT_USUARIOS, seedPalpiteAttempt,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /meus-palpites',
  usuarios: PALPITE_ATTEMPT_USUARIOS,
  mockData: { route: 'meus-palpites' },
  seed: seedPalpiteAttempt,
  // prettier-ignore
  scenarios: [
    ['sem_token',     'GET',    HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['user',          'GET',    HTTP.OK,                 'listando meus palpites'],
    ['super_admin',   'GET',    HTTP.OK,                 'admin listando palpites'],
  ],
});

import {
  test, HTTP,
  describeAttemptSuite,
  PALPITE_ATTEMPT_USUARIOS, seedPalpiteAttempt,
} from '../../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /palpites/lote',
  usuarios: PALPITE_ATTEMPT_USUARIOS,
  seed: seedPalpiteAttempt,
  mockData: {
    route: 'palpites/lote',
    payload: { palpites: [{ jogoId: 'a0000000-0000-4000-a000-000000000000', golsCasa: 1, golsFora: 0 }] },
  },
  // prettier-ignore
  scenarios: [
    ['sem_token',      'POST',  HTTP.UNAUTHORIZED,  'sem autenticação'],
    ['user',           'POST',  HTTP.CREATED,       'usuário autenticado'],
    ['super_admin',    'POST',  HTTP.CREATED,       'super admin'],
  ],
});

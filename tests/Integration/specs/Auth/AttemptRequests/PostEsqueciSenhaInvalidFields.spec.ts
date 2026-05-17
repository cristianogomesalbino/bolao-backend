import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, buildAuthMock,
  AUTH_ATTEMPT_USUARIOS, seedAuthAttempt,
} from '../../../resources';

const { route, payload } = buildAuthMock('post_esqueci_senha');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /auth/esqueci-senha - Campos Inválidos',
  route,
  usuario: AUTH_ATTEMPT_USUARIOS.user,
  basePayload: payload!,
  seed: seedAuthAttempt,
  // prettier-ignore
  scenarios: [
    // [campo,   valor,           status,             mensagem]
    ['email',    INVALID.EMPTY,   HTTP.UNPROCESSABLE, 'Email é obrigatório'],
    ['email',    INVALID.NULL,    HTTP.UNPROCESSABLE, 'Email é obrigatório'],
    ['email',    INVALID.EMAIL,   HTTP.UNPROCESSABLE, 'Email inválido'],
    ['email',    INVALID.MAX_INT, HTTP.UNPROCESSABLE, 'Email inválido'],
  ],
});

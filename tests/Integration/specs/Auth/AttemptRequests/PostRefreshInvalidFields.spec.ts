import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, buildAuthMock,
  AUTH_ATTEMPT_USUARIOS, seedAuthAttempt,
} from '../../../resources';

const { route, payload } = buildAuthMock('post_refresh');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /auth/refresh - Campos Inválidos',
  route,
  usuario: AUTH_ATTEMPT_USUARIOS.user,
  basePayload: payload!,
  seed: seedAuthAttempt,
  // prettier-ignore
  scenarios: [
    // [campo,          valor,           status,             mensagem]
    ['refreshToken',    INVALID.EMPTY,   HTTP.UNPROCESSABLE, 'Refresh token é obrigatório'],
    ['refreshToken',    INVALID.NULL,    HTTP.UNPROCESSABLE, 'Refresh token é obrigatório'],
    ['refreshToken',    INVALID.MAX_INT, HTTP.UNPROCESSABLE, 'Refresh token deve ser uma string'],
  ],
});

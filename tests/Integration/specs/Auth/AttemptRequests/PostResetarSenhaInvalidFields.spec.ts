import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, buildAuthMock,
  AUTH_ATTEMPT_USUARIOS, seedAuthAttempt,
} from '../../../resources';

const { route, payload } = buildAuthMock('post_resetar_senha');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /auth/resetar-senha - Campos Inválidos',
  route,
  usuario: AUTH_ATTEMPT_USUARIOS.user,
  basePayload: payload!,
  seed: seedAuthAttempt,
  // prettier-ignore
  scenarios: [
    // [campo,            valor,                  status,             mensagem]
    ['token',             INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'Token é obrigatório'],
    ['token',             INVALID.NULL,           HTTP.UNPROCESSABLE, 'Token é obrigatório'],
    ['novaSenha',         INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'Nova senha deve ter no mínimo 6 caracteres'],
    ['novaSenha',         INVALID.NULL,           HTTP.UNPROCESSABLE, 'Nova senha deve ter no mínimo 6 caracteres'],
    ['novaSenha',         INVALID.SHORT_PASSWORD, HTTP.UNPROCESSABLE, 'Nova senha deve ter no mínimo 6 caracteres'],
    ['confirmarSenha',    INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'As senhas não coincidem'],
    ['confirmarSenha',    INVALID.NULL,           HTTP.UNPROCESSABLE, 'As senhas não coincidem'],
    ['confirmarSenha',    'diferente123',         HTTP.UNPROCESSABLE, 'As senhas não coincidem'],
  ],
});

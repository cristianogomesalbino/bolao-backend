import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt,
} from '../../../resources';

const { route, payload } = buildUsuarioMock('post_usuario');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /usuarios - Campos Inválidos',
  route,
  usuario: USUARIO_ATTEMPT_USUARIOS.usuario_comum,
  basePayload: payload!,
  seed: seedUsuarioAttempt,
  uniqueFieldResolver: (i) => ({ email: `invalid.${i}.${Date.now()}@teste.qa` }),
  // prettier-ignore
  scenarios: [
    // [campo,          valor,                  status,           mensagem,                                  skip?]
    ['nome',            INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'Nome é obrigatório'],
    ['nome',            INVALID.NULL,           HTTP.UNPROCESSABLE, 'Nome é obrigatório'],
    ['nome',            INVALID.CHAR_256,       HTTP.UNPROCESSABLE, 'Nome deve ter no máximo 255 caracteres',   'Backend não valida @MaxLength'],
    ['nome',            INVALID.MIN_CHAR,       HTTP.UNPROCESSABLE, 'Nome deve ter no mínimo 2 caracteres',     'Backend não valida @MinLength'],
    ['nome',            INVALID.SPECIAL_CHARS,  HTTP.UNPROCESSABLE, 'Nome deve conter apenas letras e espaços', 'Backend não valida caracteres especiais'],
    ['confirmarSenha',  'different',            HTTP.UNPROCESSABLE, 'As senhas dever ser iguais',               'Campo não existe no DTO'],
    ['email',           INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'Email inválido'],
    ['email',           INVALID.EMAIL,          HTTP.UNPROCESSABLE, 'Email inválido'],
    ['email',           INVALID.MAX_INT,        HTTP.UNPROCESSABLE, 'Email inválido'],
    ['email',           INVALID.NULL,           HTTP.UNPROCESSABLE, 'Email inválido'],
    ['senha',           INVALID.SHORT_PASSWORD, HTTP.UNPROCESSABLE, 'Senha deve ter no mínimo 6 caracteres'],
    ['senha',           INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'Senha deve ter no mínimo 6 caracteres'],
    ['senha',           INVALID.NULL,           HTTP.UNPROCESSABLE, 'Senha deve ter no mínimo 6 caracteres'],
  ],
});

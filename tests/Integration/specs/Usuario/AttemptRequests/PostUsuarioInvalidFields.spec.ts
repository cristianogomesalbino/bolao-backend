import {
  test,
  describeInvalidFieldSuite,
  buildUsuarioMock,
  HTTP_422,
  EMPTY, NULL_VALUE, MAX_INT, CHAR_256, MIN_CHAR,
  INVALID_EMAIL, SHORT_PASSWORD, SPECIAL_CHARS,
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
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
    // [campo,          valor,           status,   mensagem,                                  skip?]
    ['nome',            EMPTY,           HTTP_422, 'Nome é obrigatório'],
    ['nome',            NULL_VALUE,      HTTP_422, 'Nome é obrigatório'],
    ['nome',            CHAR_256,        HTTP_422, 'Nome deve ter no máximo 255 caracteres',   'Backend não valida @MaxLength'],
    ['nome',            MIN_CHAR,        HTTP_422, 'Nome deve ter no mínimo 2 caracteres',     'Backend não valida @MinLength'],
    ['nome',            SPECIAL_CHARS,   HTTP_422, 'Nome deve conter apenas letras e espaços', 'Backend não valida caracteres especiais'],
    ['confirmarSenha',  'different',     HTTP_422, 'As senhas dever ser iguais',               'Campo não existe no DTO'],
    ['email',           EMPTY,           HTTP_422, 'Email inválido'],
    ['email',           INVALID_EMAIL,   HTTP_422, 'Email inválido'],
    ['email',           MAX_INT,         HTTP_422, 'Email inválido'],
    ['email',           NULL_VALUE,      HTTP_422, 'Email inválido'],
    ['senha',           SHORT_PASSWORD,  HTTP_422, 'Senha deve ter no mínimo 6 caracteres'],
    ['senha',           EMPTY,           HTTP_422, 'Senha deve ter no mínimo 6 caracteres'],
    ['senha',           NULL_VALUE,      HTTP_422, 'Senha deve ter no mínimo 6 caracteres'],
  ],
});

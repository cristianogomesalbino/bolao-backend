import {
  test,
  HTTP_UNPROCESSABLE_ENTITY as HTTP_422,
  CHAR_256,
  EMPTY,
  MAX_INT,
  NULL_VALUE,
  INVALID_EMAIL,
  SHORT_PASSWORD,
  describeInvalidFieldSuite,
  USUARIO_ATTEMPT_USUARIOS,
  seedUsuarioAttempt,
  MIN_CHAR,
  SPECIAL_CHARS,
} from '../../../resources';

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /usuarios - Campos Inválidos',
  route: 'usuarios',
  usuario: USUARIO_ATTEMPT_USUARIOS.user,
  basePayload: { nome: 'User Valido QA', email: 'valido@teste.qa', senha: 'Teste123!' },
  seed: seedUsuarioAttempt,
  uniqueFieldResolver: (i) => ({ email: `invalid.${i}.${Date.now()}@teste.qa` }),
  // prettier-ignore
  scenarios: [
    // [campo,          valor,           status,   mensagem,                                  skip?]
    ['nome',            EMPTY,           HTTP_422, 'Nome é obrigatório'],
    ['nome',            NULL_VALUE,      HTTP_422, 'Nome é obrigatório'],
    ['nome',            CHAR_256,        HTTP_422, 'Nome deve ter no máximo 255 caracteres',   'Backend não valida @MaxLength'],
    ['nome',            MIN_CHAR,        HTTP_422, 'Nome deve ter no mínimo 2 caracteres',     'Backend não valida @minLenth'],
    ['nome',            SPECIAL_CHARS,   HTTP_422, 'Nome deve conter apenas letras e espaços', 'Backend não valida caracteres especiais'],
    ['confirmarSenha',  'different',     HTTP_422, 'As senhas dever ser iguais',               'Campo nao existe'],
    ['email',           EMPTY,           HTTP_422, 'Email inválido'],
    ['email',           INVALID_EMAIL,   HTTP_422, 'Email inválido'],
    ['email',           MAX_INT,         HTTP_422, 'Email inválido'],
    ['email',           NULL_VALUE,      HTTP_422, 'Email inválido'],
    ['senha',           SHORT_PASSWORD,  HTTP_422, 'Senha deve ter no mínimo 6 caracteres'],
    ['senha',           EMPTY,           HTTP_422, 'Senha deve ter no mínimo 6 caracteres'],
    ['senha',           NULL_VALUE,      HTTP_422, 'Senha deve ter no mínimo 6 caracteres'],
  ],
});

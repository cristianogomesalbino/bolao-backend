import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite,
  GRUPO_SIMPLE_ATTEMPT_USUARIOS, seedGrupoSimpleAttempt,
} from '../../../resources';

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /grupos - Campos Inválidos',
  route: 'grupos',
  usuario: GRUPO_SIMPLE_ATTEMPT_USUARIOS.user,
  basePayload: {
    nome: 'Grupo InvalidFields QA',
    temporadaId: INVALID.UUID_INEXISTENTE,
    privado: true,
  },
  seed: seedGrupoSimpleAttempt,
  // prettier-ignore
  scenarios: [
    // [campo,          valor,                  status,             mensagem]
    ['nome',            INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'Deve ter entre 3 e 100 caracteres'],
    ['nome',            INVALID.NULL,           HTTP.UNPROCESSABLE, 'O campo é obrigatório'],
    ['nome',            INVALID.MIN_CHAR,       HTTP.UNPROCESSABLE, 'Deve ter entre 3 e 100 caracteres'],
    ['nome',            INVALID.MAX_INT,        HTTP.UNPROCESSABLE, 'Deve ter entre 3 e 100 caracteres'],
    ['temporadaId',     INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'Deve ser um UUID válido'],
    ['temporadaId',     INVALID.NULL,           HTTP.UNPROCESSABLE, 'O campo é obrigatório'],
    ['temporadaId',     INVALID.UUID,           HTTP.UNPROCESSABLE, 'Deve ser um UUID válido'],
    ['privado',         INVALID.NULL,           HTTP.UNPROCESSABLE, 'O campo é obrigatório'],
    ['privado',         INVALID.STRING,         HTTP.UNPROCESSABLE, 'Deve ser verdadeiro ou falso'],
    ['privado',         INVALID.MAX_INT,        HTTP.UNPROCESSABLE, 'Deve ser verdadeiro ou falso'],
  ],
});

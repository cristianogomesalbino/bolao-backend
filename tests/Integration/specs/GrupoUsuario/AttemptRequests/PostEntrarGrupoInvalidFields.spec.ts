import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite,
  GRUPO_SIMPLE_ATTEMPT_USUARIOS, seedGrupoSimpleAttempt,
} from '../../../resources';

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /grupos/entrar - Campos Inválidos',
  route: 'grupos/entrar',
  usuario: GRUPO_SIMPLE_ATTEMPT_USUARIOS.user,
  basePayload: { codigoConvite: 'ABCD1234' },
  seed: seedGrupoSimpleAttempt,
  // prettier-ignore
  scenarios: [
    // [campo,            valor,                  status,             mensagem]
    ['codigoConvite',     INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'codigoConvite deve ter exatamente 8 caracteres'],
    ['codigoConvite',     INVALID.NULL,           HTTP.UNPROCESSABLE, 'codigoConvite deve ter exatamente 8 caracteres'],
    ['codigoConvite',     'ABC',                  HTTP.UNPROCESSABLE, 'codigoConvite deve ter exatamente 8 caracteres'],
    ['codigoConvite',     'ABCDEFGHIJ',           HTTP.UNPROCESSABLE, 'codigoConvite deve ter exatamente 8 caracteres'],
    ['codigoConvite',     INVALID.MAX_INT,        HTTP.UNPROCESSABLE, 'codigoConvite deve ter exatamente 8 caracteres'],
  ],
});

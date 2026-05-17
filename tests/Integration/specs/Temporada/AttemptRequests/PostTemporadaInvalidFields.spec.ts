import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, buildTemporadaMock,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttempt,
} from '../../../resources';

const { route, payload } = buildTemporadaMock('post_temporada');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /temporadas - Campos Inválidos',
  route,
  usuario: TEMPORADA_ATTEMPT_USUARIOS.user,
  basePayload: payload!,
  seed: seedTemporadaAttempt,
  // prettier-ignore
  scenarios: [
    // [campo,          valor,                  status,             mensagem]
    ['ano',             INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'O ano deve ser menor ou igual a 2100'],
    ['ano',             INVALID.NULL,           HTTP.UNPROCESSABLE, 'O ano deve ser menor ou igual a 2100'],
    ['ano',             INVALID.STRING,         HTTP.UNPROCESSABLE, 'O ano deve ser menor ou igual a 2100'],
    ['ano',             1999,                   HTTP.UNPROCESSABLE, 'O ano deve ser maior ou igual a 2000'],
    ['ano',             2101,                   HTTP.UNPROCESSABLE, 'O ano deve ser menor ou igual a 2100'],
    ['campeonatoId',    INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'campeonatoId deve ser um UUID válido'],
    ['campeonatoId',    INVALID.NULL,           HTTP.UNPROCESSABLE, 'campeonatoId deve ser um UUID válido'],
    ['campeonatoId',    INVALID.UUID,           HTTP.UNPROCESSABLE, 'campeonatoId deve ser um UUID válido'],
  ],
});

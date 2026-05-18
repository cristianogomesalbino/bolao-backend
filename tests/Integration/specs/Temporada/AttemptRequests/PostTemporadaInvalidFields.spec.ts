import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttemptWithCampeonato,
  CampeonatoDB,
} from '../../../resources';

let campeonatoId: string;

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /temporadas - Campos Inválidos',
  route: 'temporadas',
  usuario: TEMPORADA_ATTEMPT_USUARIOS.user,
  basePayload: { ano: 2026, campeonatoId: INVALID.UUID_INEXISTENTE },
  seed: async () => {
    const data = await seedTemporadaAttemptWithCampeonato();
    campeonatoId = data.campeonatoId;
  },
  uniqueFieldResolver: (i, campo) => {
    // Garante que o basePayload usa campeonatoId real (exceto quando testando o próprio campo)
    if (campo !== 'campeonatoId') return { campeonatoId };
    return {};
  },
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

import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, buildCampeonatoMock,
  CAMPEONATO_ATTEMPT_USUARIOS, seedCampeonatoAttempt,
} from '../../../resources';

const { route, payload } = buildCampeonatoMock('post_campeonato');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /campeonatos - Campos Inválidos',
  route,
  usuario: CAMPEONATO_ATTEMPT_USUARIOS.user,
  basePayload: payload!,
  seed: seedCampeonatoAttempt,
  // prettier-ignore
  scenarios: [
    // [campo,   valor,                  status,             mensagem]
    ['nome',     INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'O nome é obrigatório'],
    ['nome',     INVALID.NULL,           HTTP.UNPROCESSABLE, 'O nome é obrigatório'],
    ['nome',     INVALID.MAX_INT,        HTTP.UNPROCESSABLE, 'O nome deve ser um texto'],
    ['nome',     INVALID.CHAR_256,       HTTP.UNPROCESSABLE, 'Nome deve ter no máximo 255 caracteres',  'Backend não valida @MaxLength'],
  ],
});

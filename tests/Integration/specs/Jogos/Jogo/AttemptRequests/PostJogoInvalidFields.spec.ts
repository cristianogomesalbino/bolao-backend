import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, factoryJogo,
  FASE_ATTEMPT_USUARIOS, seedJogoAttemptWithFase,
} from '../../../../resources';

const basePayload = factoryJogo('for_post_jogo');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /fases/:id/jogos - Campos Inválidos',
  route: 'placeholder',
  usuario: FASE_ATTEMPT_USUARIOS.user,
  basePayload,
  seed: seedJogoAttemptWithFase,
  routeResolver: (data) => `fases/${data.faseId}/jogos`,
  // prettier-ignore
  scenarios: [
    ['timeCasaId',    INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'timeCasaId é obrigatório'],
    ['timeCasaId',    INVALID.NULL,           HTTP.UNPROCESSABLE, 'timeCasaId é obrigatório'],
    ['timeCasaId',    INVALID.MAX_INT,        HTTP.UNPROCESSABLE, 'timeCasaId deve ser uma string'],
    ['timeForaId',    INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'timeForaId é obrigatório'],
    ['timeForaId',    INVALID.NULL,           HTTP.UNPROCESSABLE, 'timeForaId é obrigatório'],
    ['timeForaId',    INVALID.MAX_INT,        HTTP.UNPROCESSABLE, 'timeForaId deve ser uma string'],
    ['dataHora',      INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'dataHora é obrigatório'],
    ['dataHora',      INVALID.NULL,           HTTP.UNPROCESSABLE, 'dataHora é obrigatório'],
    ['dataHora',      'nao-e-data',           HTTP.UNPROCESSABLE, 'dataHora deve ser uma data válida no formato ISO 8601'],
  ],
});

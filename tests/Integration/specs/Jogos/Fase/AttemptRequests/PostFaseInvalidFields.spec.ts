import {
  test, HTTP, INVALID, factoryFase,
  describeInvalidFieldSuite,
  FASE_ATTEMPT_USUARIOS, seedFaseAttemptWithTemporada,
} from '../../../../resources';

const basePayload = factoryFase('for_post_fase_pontos_corridos');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /temporadas/:id/fases - Campos Inválidos',
  route: 'placeholder',
  usuario: FASE_ATTEMPT_USUARIOS.user,
  basePayload,
  seed: seedFaseAttemptWithTemporada,
  routeResolver: (data) => `temporadas/${data.temporadaId}/fases`,
  // prettier-ignore
  scenarios: [
    ['nome',     INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'nome é obrigatório'],
    ['nome',     INVALID.NULL,           HTTP.UNPROCESSABLE, 'nome é obrigatório'],
    ['nome',     INVALID.MAX_INT,        HTTP.UNPROCESSABLE, 'nome deve ser uma string'],
    ['tipo',     INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'tipo deve ser PONTOS_CORRIDOS ou MATA_MATA'],
    ['tipo',     'INVALIDO',             HTTP.UNPROCESSABLE, 'tipo deve ser PONTOS_CORRIDOS ou MATA_MATA'],
    ['tipo',     INVALID.NULL,           HTTP.UNPROCESSABLE, 'tipo deve ser PONTOS_CORRIDOS ou MATA_MATA'],
    ['ordem',    INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'ordem deve ser no mínimo 1'],
    ['ordem',    INVALID.NULL,           HTTP.UNPROCESSABLE, 'ordem deve ser no mínimo 1'],
    ['ordem',    INVALID.STRING,         HTTP.UNPROCESSABLE, 'ordem deve ser no mínimo 1'],
    ['ordem',    0,                      HTTP.UNPROCESSABLE, 'ordem deve ser no mínimo 1'],
    ['ordem',    -1,                     HTTP.UNPROCESSABLE, 'ordem deve ser no mínimo 1'],
  ],
});

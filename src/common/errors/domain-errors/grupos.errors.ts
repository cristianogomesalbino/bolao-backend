import { DomainError } from '../domain-error';
import { GRUPOS } from '../../../modules/grupos/grupos.constants';

export class TemporadaNaoEncontradaError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = GRUPOS.MENSAGENS.TEMPORADA_NAO_ENCONTRADA) {
    super(mensagem);
  }
}

export class GrupoNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = GRUPOS.MENSAGENS.GRUPO_NAO_ENCONTRADO) {
    super(mensagem);
  }
}

export class DesativeAntesDeExcluirError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = GRUPOS.MENSAGENS.DESATIVE_ANTES_EXCLUIR) {
    super(mensagem);
  }
}

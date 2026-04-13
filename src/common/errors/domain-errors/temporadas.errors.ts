import { DomainError } from '../domain-error';
import { TEMPORADAS } from '../../../modules/temporadas/temporadas.constants';

export class CampeonatoNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = TEMPORADAS.MENSAGENS.CAMPEONATO_NAO_ENCONTRADO) {
    super(mensagem);
  }
}

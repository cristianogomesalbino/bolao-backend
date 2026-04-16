import { DomainError } from '../domain-error';
import { RANKING } from '../../../modules/ranking/ranking.constants';

export class JogoNaoFinalizadoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = RANKING.MENSAGENS.JOGO_NAO_FINALIZADO) {
    super(mensagem);
  }
}

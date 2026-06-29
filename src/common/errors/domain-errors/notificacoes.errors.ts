import { DomainError } from '../domain-error';
import { NOTIFICACOES } from '../../../modules/notificacoes/notificacoes.constants';

export class NotificacaoNaoEncontradaError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = NOTIFICACOES.MENSAGENS.NOTIFICACAO_NAO_ENCONTRADA) {
    super(mensagem);
  }
}

export class LimiteInscricoesPushError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = NOTIFICACOES.MENSAGENS.LIMITE_INSCRICOES_ATINGIDO) {
    super(mensagem);
  }
}

export class InscricaoPushNaoEncontradaError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = NOTIFICACOES.MENSAGENS.INSCRICAO_NAO_ENCONTRADA) {
    super(mensagem);
  }
}

export class TipoNotificacaoInvalidoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = NOTIFICACOES.MENSAGENS.TIPO_INVALIDO) {
    super(mensagem);
  }
}

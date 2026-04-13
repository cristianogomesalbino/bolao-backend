import { DomainError } from '../domain-error';
import { AUTH } from '../../../modules/auth/auth.constants';

export class CredenciaisInvalidasError extends DomainError {
  readonly statusCode = 401;
  constructor(mensagem = AUTH.MENSAGENS.CREDENCIAIS_INVALIDAS) {
    super(mensagem);
  }
}

export class RefreshNaoFornecidoError extends DomainError {
  readonly statusCode = 401;
  constructor(mensagem = AUTH.MENSAGENS.REFRESH_NAO_FORNECIDO) {
    super(mensagem);
  }
}

export class RefreshInvalidoError extends DomainError {
  readonly statusCode = 401;
  constructor(mensagem = AUTH.MENSAGENS.REFRESH_INVALIDO) {
    super(mensagem);
  }
}

export class RefreshExpiradoError extends DomainError {
  readonly statusCode = 401;
  constructor(mensagem = AUTH.MENSAGENS.REFRESH_EXPIRADO) {
    super(mensagem);
  }
}

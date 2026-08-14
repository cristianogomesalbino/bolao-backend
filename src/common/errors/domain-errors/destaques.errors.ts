import { DomainError } from '../domain-error';
import { DESTAQUES } from '../../../modules/destaques/destaques.constants';

export class DestaqueNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor() {
    super(DESTAQUES.MENSAGENS.DESTAQUE_NAO_ENCONTRADO);
  }
}

export class DestaqueForaDoEscopoError extends DomainError {
  readonly statusCode = 404;
  constructor() {
    super(DESTAQUES.MENSAGENS.DESTAQUE_FORA_DO_ESCOPO);
  }
}

export class ReacaoApenasNaoPalpitouError extends DomainError {
  readonly statusCode = 422;
  constructor() {
    super(DESTAQUES.MENSAGENS.REACAO_APENAS_NAO_PALPITOU);
  }
}

export class NaoPodeEnviarFParaSiMesmoError extends DomainError {
  readonly statusCode = 422;
  constructor() {
    super(DESTAQUES.MENSAGENS.NAO_PODE_F_PARA_SI_MESMO);
  }
}

export class UsuarioJaEnviouFError extends DomainError {
  readonly statusCode = 409;
  constructor() {
    super(DESTAQUES.MENSAGENS.USUARIO_JA_ENVIOU_F);
  }
}

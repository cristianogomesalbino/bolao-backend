import { DomainError } from '../domain-error';
import { PALPITES } from '../../../modules/palpites/palpites.constants';

export class PalpiteNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = PALPITES.MENSAGENS.PALPITE_NAO_ENCONTRADO) {
    super(mensagem);
  }
}

export class JogoNaoAceitaPalpitesError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = PALPITES.MENSAGENS.JOGO_NAO_ACEITA_PALPITES) {
    super(mensagem);
  }
}

export class PalpiteJaExisteError extends DomainError {
  readonly statusCode = 409;
  constructor(mensagem = PALPITES.MENSAGENS.PALPITE_JA_EXISTE) {
    super(mensagem);
  }
}

export class PalpiteNaoPertenceAoUsuarioError extends DomainError {
  readonly statusCode = 403;
  constructor(mensagem = PALPITES.MENSAGENS.PALPITE_NAO_PERTENCE_AO_USUARIO) {
    super(mensagem);
  }
}

export class GrupoNaoPermiteDobroError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = PALPITES.MENSAGENS.GRUPO_NAO_PERMITE_DOBRO) {
    super(mensagem);
  }
}

export class SemFichasDobroError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = PALPITES.MENSAGENS.SEM_FICHAS_DOBRO) {
    super(mensagem);
  }
}

export class DobroJaAtivoError extends DomainError {
  readonly statusCode = 409;
  constructor(mensagem = PALPITES.MENSAGENS.DOBRO_JA_ATIVO) {
    super(mensagem);
  }
}

export class DobroNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = PALPITES.MENSAGENS.DOBRO_NAO_ENCONTRADO) {
    super(mensagem);
  }
}

export class JogoNaoAceitaDobroError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = PALPITES.MENSAGENS.JOGO_NAO_ACEITA_DOBRO) {
    super(mensagem);
  }
}

export class JogoNaoPertenceAoGrupoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = PALPITES.MENSAGENS.JOGO_NAO_PERTENCE_AO_GRUPO) {
    super(mensagem);
  }
}

export class JogoPendenteConfirmacaoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = PALPITES.MENSAGENS.JOGO_PENDENTE_CONFIRMACAO) {
    super(mensagem);
  }
}

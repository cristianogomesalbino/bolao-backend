import { DomainError } from '../domain-error';
import { STORIES } from '../../../modules/stories/stories.constants';

export class StoryNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor() {
    super(STORIES.MENSAGENS.STORY_NAO_ENCONTRADO);
  }
}

export class StoryForaDoEscopoError extends DomainError {
  readonly statusCode = 404;
  constructor() {
    super(STORIES.MENSAGENS.STORY_FORA_DO_ESCOPO);
  }
}

export class ReacaoApenasNaoPalpitouError extends DomainError {
  readonly statusCode = 422;
  constructor() {
    super(STORIES.MENSAGENS.REACAO_APENAS_NAO_PALPITOU);
  }
}

export class NaoPodeEnviarFParaSiMesmoError extends DomainError {
  readonly statusCode = 422;
  constructor() {
    super(STORIES.MENSAGENS.NAO_PODE_F_PARA_SI_MESMO);
  }
}

export class UsuarioJaEnviouFError extends DomainError {
  readonly statusCode = 409;
  constructor() {
    super(STORIES.MENSAGENS.USUARIO_JA_ENVIOU_F);
  }
}

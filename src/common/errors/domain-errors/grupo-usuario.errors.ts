import { DomainError } from '../domain-error';
import { GRUPO_USUARIO } from '../../../modules/grupo-usuario/grupo-usuario.constants';

export class CodigoConviteInvalidoError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = GRUPO_USUARIO.MENSAGENS.CODIGO_CONVITE_INVALIDO) {
    super(mensagem);
  }
}

export class GrupoInativoError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = GRUPO_USUARIO.MENSAGENS.GRUPO_INATIVO) {
    super(mensagem);
  }
}

export class JaEstaNoGrupoError extends DomainError {
  readonly statusCode = 409;
  constructor(mensagem = GRUPO_USUARIO.MENSAGENS.JA_ESTA_NO_GRUPO) {
    super(mensagem);
  }
}

export class LimiteParticipantesError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = GRUPO_USUARIO.MENSAGENS.LIMITE_PARTICIPANTES) {
    super(mensagem);
  }
}

export class UnicoAdminError extends DomainError {
  readonly statusCode = 400;
  constructor(mensagem = GRUPO_USUARIO.MENSAGENS.UNICO_ADMIN) {
    super(mensagem);
  }
}

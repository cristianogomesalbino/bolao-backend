import { DomainError } from '../domain-error';
import { USUARIOS } from '../../../modules/usuarios/usuarios.constants';

export class UsuarioNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor(mensagem = USUARIOS.MENSAGENS.USUARIO_NAO_ENCONTRADO) {
    super(mensagem);
  }
}

export class EmailJaCadastradoError extends DomainError {
  readonly statusCode = 409;
  constructor(mensagem = USUARIOS.MENSAGENS.EMAIL_JA_CADASTRADO) {
    super(mensagem);
  }
}

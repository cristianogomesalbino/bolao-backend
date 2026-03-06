import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export class ErrorFactory {

  static badRequest(mensagem: string) {
    return new BadRequestException({
      erros: [
        {
          mensagens: [mensagem],
        },
      ],
    });
  }

  static notFound(mensagem: string) {
    return new NotFoundException({
      erros: [
        {
          mensagens: [mensagem],
        },
      ],
    });
  }

  static forbidden(mensagem: string) {
    return new ForbiddenException({
      erros: [
        {
          mensagens: [mensagem],
        },
      ],
    });
  }

  static conflict(mensagem: string) {
    return new ConflictException({
      erros: [
        {
          mensagens: [mensagem],
        },
      ],
    });
  }

  static unauthorized(mensagem: string) {
    return new UnauthorizedException({
      erros: [
        {
          mensagens: [mensagem],
        },
      ],
    });
  }
}

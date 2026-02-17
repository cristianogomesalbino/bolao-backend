import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    if (exceptionResponse?.erros) {
      return response.status(status).json(exceptionResponse);
    }

    const mensagens = this.extrairMensagens(exceptionResponse);

    return response.status(status).json({
      erros: [
        {
          campo: 'geral',
          mensagens,
        },
      ],
    });
  }

  private extrairMensagens(exceptionResponse: any): string[] {
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse?.message;

    if (!message) return ['Erro inesperado.'];

    return Array.isArray(message) ? message : [message];
  }
}


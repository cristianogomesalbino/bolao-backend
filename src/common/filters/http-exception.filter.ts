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
    if (typeof exceptionResponse === 'string') {
      return [exceptionResponse];
    }

    const message = exceptionResponse?.message;

    if (!message) {
      return ['Erro inesperado.'];
    }

    return Array.isArray(message) ? message : [message];
  }
}

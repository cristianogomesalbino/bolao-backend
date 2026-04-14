import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const error = exception.getResponse();
      return response.status(status).json(error);
    }

    // Log de erros não-HTTP para debug
    console.error('[HttpExceptionFilter] Erro não tratado:', exception);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      erros: [
        {
          mensagens: ['Erro interno do servidor.'],
        },
      ],
    });
  }
}

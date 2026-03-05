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
    
    // Se for HttpException, pega o status dela
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.BAD_REQUEST;

    // Se for erro de JSON parse
    if (exception instanceof SyntaxError && 'body' in exception) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        erros: [
          {
            campo: 'geral',
            mensagens: ['Formato JSON inválido. Verifique se o corpo da requisição está correto.'],
          },
        ],
      });
    }

    // Se for HttpException
    if (exception instanceof HttpException) {
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

    // Erro genérico
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      erros: [
        {
          campo: 'geral',
          mensagens: ['Erro interno do servidor.'],
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

    const mensagens = Array.isArray(message) ? message : [message];

    return mensagens.map(msg => {
      if (typeof msg === 'string' && msg.includes('is not valid JSON')) {
        return 'Formato JSON inválido. Verifique se o corpo da requisição está correto.';
      }
      if (typeof msg === 'string' && msg.includes('Unexpected token')) {
        return 'Erro ao processar a requisição. Verifique a sintaxe do JSON enviado.';
      }
      return msg;
    });
  }
}


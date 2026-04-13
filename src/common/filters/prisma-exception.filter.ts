import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'P2002') {
      const target = exception.meta?.target as string[] | undefined;
      const campo = target?.[0];

      return response.status(409).json({
        erros: [
          {
            ...(campo && { campo }),
            mensagens: ['Já existe um registro com esse valor.'],
          },
        ],
      });
    }

    return response.status(400).json({
      erros: [
        {
          mensagens: ['Erro no banco de dados.'],
        },
      ],
    });
  }
}

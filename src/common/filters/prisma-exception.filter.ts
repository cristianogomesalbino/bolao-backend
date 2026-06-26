import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    this.logger.error(
      `Prisma error [${exception.code}]: ${exception.message}`,
      exception.meta ? JSON.stringify(exception.meta) : undefined,
    );

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

    if (exception.code === 'P2025') {
      return response.status(404).json({
        erros: [
          {
            mensagens: ['Registro não encontrado.'],
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

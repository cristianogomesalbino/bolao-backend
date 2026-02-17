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
        return response.status(400).json({
          erros: [
            {
              campo: 'nome',
              mensagens: ['Já existe um registro com esse valor.'],
            },
          ],
        });
      }
  
      return response.status(400).json({
        erros: [
          {
            campo: 'geral',
            mensagens: ['Erro no banco de dados.'],
          },
        ],
      });
    }
  }
  
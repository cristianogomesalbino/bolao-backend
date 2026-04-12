import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { Prisma } from '@prisma/client';

const createMockHost = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status, json }),
    }),
    status,
    json,
  };
};

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
  });

  it('deve retornar 409 com campo dinâmico para P2002', () => {
    const { switchToHttp, status, json } = createMockHost();

    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '6.0.0', meta: { target: ['email'] } },
    );

    filter.catch(exception, { switchToHttp } as any);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      erros: [
        {
          campo: 'email',
          mensagens: ['Já existe um registro com esse valor.'],
        },
      ],
    });
  });

  it('deve retornar 409 sem campo quando meta.target não existe para P2002', () => {
    const { switchToHttp, status, json } = createMockHost();

    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '6.0.0' },
    );

    filter.catch(exception, { switchToHttp } as any);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      erros: [
        {
          mensagens: ['Já existe um registro com esse valor.'],
        },
      ],
    });
  });

  it('deve retornar 400 sem campo para outros erros Prisma', () => {
    const { switchToHttp, status, json } = createMockHost();

    const exception = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      { code: 'P2003', clientVersion: '6.0.0' },
    );

    filter.catch(exception, { switchToHttp } as any);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      erros: [
        {
          mensagens: ['Erro no banco de dados.'],
        },
      ],
    });
  });
});

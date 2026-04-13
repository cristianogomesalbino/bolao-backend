import { describe, it, expect } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorFactory } from './error.factory';

describe('ErrorFactory', () => {
  it('deve criar BadRequestException com formato correto', () => {
    const error = ErrorFactory.badRequest('Dados inválidos');

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse()).toEqual({
      erros: [{ mensagens: ['Dados inválidos'] }],
    });
  });

  it('deve criar NotFoundException com formato correto', () => {
    const error = ErrorFactory.notFound('Recurso não encontrado');

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getResponse()).toEqual({
      erros: [{ mensagens: ['Recurso não encontrado'] }],
    });
  });

  it('deve criar ForbiddenException com formato correto', () => {
    const error = ErrorFactory.forbidden('Sem permissão');

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toEqual({
      erros: [{ mensagens: ['Sem permissão'] }],
    });
  });

  it('deve criar ConflictException com formato correto', () => {
    const error = ErrorFactory.conflict('Registro já existe');

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toEqual({
      erros: [{ mensagens: ['Registro já existe'] }],
    });
  });

  it('deve criar UnauthorizedException com formato correto', () => {
    const error = ErrorFactory.unauthorized('Não autenticado');

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.getResponse()).toEqual({
      erros: [{ mensagens: ['Não autenticado'] }],
    });
  });
});

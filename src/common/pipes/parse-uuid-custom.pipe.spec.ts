import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseUUIDCustomPipe } from './parse-uuid-custom.pipe';

describe('ParseUUIDCustomPipe', () => {
  let pipe: ParseUUIDCustomPipe;

  beforeEach(() => {
    pipe = new ParseUUIDCustomPipe('id');
  });

  it('deve aceitar UUID v4 válido', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('deve lançar BadRequestException para UUID inválido', () => {
    expect(() => pipe.transform('nao-e-uuid')).toThrow(BadRequestException);
  });

  it('deve lançar BadRequestException para string vazia', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('deve incluir nome do campo na mensagem de erro', () => {
    const customPipe = new ParseUUIDCustomPipe('grupoId');

    try {
      customPipe.transform('invalido');
      fail('Deveria ter lançado exceção');
    } catch (error) {
      const response = (error as BadRequestException).getResponse();
      expect(response).toEqual({
        erros: [
          {
            campo: 'grupoId',
            mensagens: ['Deve ser um UUID válido.'],
          },
        ],
      });
    }
  });
});

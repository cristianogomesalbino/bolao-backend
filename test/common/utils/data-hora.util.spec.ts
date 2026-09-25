import { describe, it, expect } from 'vitest';
import { formatarDataHoraBrasilia } from '@src/common/utils/data-hora.util';

describe('formatarDataHoraBrasilia', () => {
  it('deve serializar 19:00 UTC como 16:00-03:00', () => {
    const result = formatarDataHoraBrasilia(
      new Date('2026-09-19T19:00:00.000Z'),
    );
    expect(result).toBe('2026-09-19T16:00:00-03:00');
  });

  it('deve retornar null para entrada vazia', () => {
    expect(formatarDataHoraBrasilia(null)).toBeNull();
    expect(formatarDataHoraBrasilia(undefined)).toBeNull();
  });

  it('deve aceitar string ISO', () => {
    const result = formatarDataHoraBrasilia('2026-09-19T20:00:00.000Z');
    expect(result).toBe('2026-09-19T17:00:00-03:00');
  });

  it('deve cruzar a meia-noite de Brasília como 00:00 do dia seguinte', () => {
    const result = formatarDataHoraBrasilia(
      new Date('2026-09-20T03:00:00.000Z'),
    );
    expect(result).toBe('2026-09-20T00:00:00-03:00');
  });
});

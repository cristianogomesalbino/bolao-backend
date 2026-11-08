import { describe, it, expect } from 'vitest';
import { mapearDestaque } from '../../../../src/modules/destaques/repositories/destaque.mapper';

describe('mapearDestaque', () => {
  const base = {
    id: 'd-1',
    grupoId: 'g-1',
    usuarioId: 'u-1',
    jogoId: 'j-1',
    rodada: 5,
    tipo: 'ACERTOU_EM_CHEIO' as const,
    titulo: 'Cravou',
    contadorFs: 2,
    criadoEm: new Date('2026-11-08T12:00:00.000Z'),
  };

  it('mapeia row Prisma para o domínio Destaque', () => {
    const resultado = mapearDestaque({
      ...base,
      dados: { golsCasa: 1, golsFora: 0 },
    });

    expect(resultado).toEqual({
      ...base,
      dados: { golsCasa: 1, golsFora: 0 },
    });
  });

  it('normaliza dados não-objeto para {}', () => {
    expect(mapearDestaque({ ...base, dados: null }).dados).toEqual({});
    expect(mapearDestaque({ ...base, dados: [1, 2] }).dados).toEqual({});
    expect(mapearDestaque({ ...base, dados: 'x' }).dados).toEqual({});
  });

  it('rejeita tipo inválido', () => {
    expect(() =>
      mapearDestaque({
        ...base,
        tipo: 'INVALIDO',
        dados: {},
      } as unknown as Parameters<typeof mapearDestaque>[0]),
    ).toThrow(/inválido/);
  });
});

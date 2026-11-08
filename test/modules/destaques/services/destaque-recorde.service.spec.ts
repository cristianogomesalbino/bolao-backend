import { describe, it, expect, beforeEach } from 'vitest';
import { DestaqueRecordeService } from '../../../../src/modules/destaques/services/destaque-recorde.service';
import { InMemoryRecordeRepository } from '../../../../src/modules/destaques/repositories/in-memory-recorde.repository';

describe('DestaqueRecordeService', () => {
  let service: DestaqueRecordeService;
  let repo: InMemoryRecordeRepository;

  beforeEach(() => {
    repo = new InMemoryRecordeRepository();
    service = new DestaqueRecordeService(repo);
  });

  it('cria recorde quando não existe', async () => {
    const resultado = await service.atualizar(
      'grupo-1',
      'temp-1',
      'RESULTADO',
      'user-1',
      4,
    );

    expect(resultado).toMatchObject({
      valor: 4,
      ehNovoRecorde: true,
    });
    expect(resultado.detentores).toEqual([{ nome: '', usuarioId: 'user-1' }]);
  });

  it('substitui detentores quando o valor supera o recorde', async () => {
    await repo.criar('grupo-1', 'temp-1', 'RESULTADO', 3, 'user-2');

    const resultado = await service.atualizar(
      'grupo-1',
      'temp-1',
      'RESULTADO',
      'user-1',
      5,
    );

    expect(resultado).toEqual({
      valor: 5,
      detentores: [{ nome: '', usuarioId: 'user-1' }],
      ehNovoRecorde: true,
    });
  });

  it('empata e adiciona detentor sem marcar como novo recorde', async () => {
    await repo.criar('grupo-1', 'temp-1', 'RESULTADO', 4, 'user-2');

    const resultado = await service.atualizar(
      'grupo-1',
      'temp-1',
      'RESULTADO',
      'user-1',
      4,
    );

    expect(resultado.ehNovoRecorde).toBe(false);
    expect(resultado.valor).toBe(4);
    expect(resultado.detentores.map((d) => d.usuarioId).sort()).toEqual([
      'user-1',
      'user-2',
    ]);
  });

  it('não altera quando o valor é menor que o recorde', async () => {
    await repo.criar('grupo-1', 'temp-1', 'RESULTADO', 6, 'user-2');

    const resultado = await service.atualizar(
      'grupo-1',
      'temp-1',
      'RESULTADO',
      'user-1',
      3,
    );

    expect(resultado).toEqual({
      valor: 6,
      detentores: [{ nome: '', usuarioId: 'user-2' }],
      ehNovoRecorde: false,
    });
  });
});

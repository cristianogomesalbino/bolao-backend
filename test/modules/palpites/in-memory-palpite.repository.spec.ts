import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPalpiteRepository } from '@src/modules/palpites/repositories/in-memory-palpite.repository';

describe('InMemoryPalpiteRepository', () => {
  let repo: InMemoryPalpiteRepository;

  beforeEach(() => {
    repo = new InMemoryPalpiteRepository();
  });

  it('deve criar e atualizar palpite', async () => {
    const criado = await repo.criar({
      usuarioId: 'user-1',
      jogoId: 'jogo-1',
      golsCasa: 1,
      golsFora: 0,
    });

    const atualizado = await repo.atualizar(criado.id, {
      golsCasa: 2,
      golsFora: 1,
    });

    expect(atualizado.golsCasa).toBe(2);
    expect(atualizado.golsFora).toBe(1);
  });

  it('deve lançar erro ao atualizar palpite inexistente', async () => {
    await expect(
      repo.atualizar('inexistente', { golsCasa: 1, golsFora: 0 }),
    ).rejects.toThrow('não encontrado');
  });
});

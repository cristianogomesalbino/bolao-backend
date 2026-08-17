import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueCronService } from '../../../../src/modules/destaques/services/destaque-cron.service';
import { DESTAQUES } from '../../../../src/modules/destaques/destaques.constants';
import type { DestaqueRepository } from '../../../../src/modules/destaques/repositories/destaque.repository.interface';

describe('DestaqueCronService', () => {
  let service: DestaqueCronService;
  let destaqueRepo: {
    removerAntigos: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    destaqueRepo = {
      removerAntigos: vi.fn().mockResolvedValue(5),
    };

    service = new DestaqueCronService(
      destaqueRepo as unknown as DestaqueRepository,
    );
  });

  it('deve chamar removerAntigos com EXPIRACAO_DIAS correto', async () => {
    await service.limparDestaquesAntigos();

    expect(destaqueRepo.removerAntigos).toHaveBeenCalledWith(
      DESTAQUES.LIMITES.EXPIRACAO_DIAS,
    );
  });

  it('deve logar quantidade removida quando > 0', async () => {
    destaqueRepo.removerAntigos.mockResolvedValue(10);
    const logSpy = vi.spyOn(service['logger'], 'log');

    await service.limparDestaquesAntigos();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('10 destaques removidos'),
    );
  });

  it('não deve logar quando nenhum destaque removido', async () => {
    destaqueRepo.removerAntigos.mockResolvedValue(0);
    const logSpy = vi.spyOn(service['logger'], 'log');

    await service.limparDestaquesAntigos();

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('não deve propagar exceção em caso de erro', async () => {
    destaqueRepo.removerAntigos.mockRejectedValue(
      new Error('DB connection lost'),
    );

    await expect(service.limparDestaquesAntigos()).resolves.toBeUndefined();
  });

  it('deve logar erro quando falha', async () => {
    destaqueRepo.removerAntigos.mockRejectedValue(
      new Error('DB connection lost'),
    );
    const errorSpy = vi.spyOn(service['logger'], 'error');

    await service.limparDestaquesAntigos();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('DB connection lost'),
      expect.any(String),
    );
  });
});

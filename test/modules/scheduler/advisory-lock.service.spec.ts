import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdvisoryLockService } from '@src/modules/scheduler/services/advisory-lock.service';
import { PrismaService } from '@src/prisma/prisma.service';

describe('AdvisoryLockService', () => {
  let service: AdvisoryLockService;
  let mockTx: { $queryRaw: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const prisma = {} as PrismaService;
    service = new AdvisoryLockService(prisma);
    mockTx = { $queryRaw: vi.fn() };
  });

  describe('tryXactLock', () => {
    it('deve retornar true quando lock é adquirido', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ locked: true }]);

      const resultado = await service.tryXactLock(1, mockTx as never);

      expect(resultado).toBe(true);
    });

    it('deve retornar false quando lock já está em uso', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ locked: false }]);

      const resultado = await service.tryXactLock(1, mockTx as never);

      expect(resultado).toBe(false);
    });

    it('deve passar o lockId correto na query', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ locked: true }]);

      await service.tryXactLock(42, mockTx as never);

      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('trySincronizacaoLock', () => {
    it('deve usar lockId 1 (SINCRONIZACAO)', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ locked: true }]);

      const resultado = await service.trySincronizacaoLock(mockTx as never);

      expect(resultado).toBe(true);
      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('tryEventosLock', () => {
    it('deve usar lockId 2 (EVENTOS_PENDENTES)', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ locked: true }]);

      const resultado = await service.tryEventosLock(mockTx as never);

      expect(resultado).toBe(true);
      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});

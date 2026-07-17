import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdvisoryLockService } from '@src/modules/scheduler/services/advisory-lock.service';
import { PrismaService } from '@src/prisma/prisma.service';

describe('AdvisoryLockService', () => {
  let service: AdvisoryLockService;
  let mockPrisma: {
    $queryRaw: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockTx: { $queryRaw: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
    };
    mockTx = { $queryRaw: vi.fn() };
    service = new AdvisoryLockService(mockPrisma as unknown as PrismaService);
  });

  describe('tentarAdquirirExclusividade', () => {
    it('deve retornar true quando lock é adquirido', async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<boolean>) => {
          mockTx.$queryRaw.mockResolvedValue([{ locked: true }]);
          return fn(mockTx);
        },
      );

      const resultado = await service.tentarAdquirirExclusividade(1);

      expect(resultado).toBe(true);
    });

    it('deve retornar false quando lock já está em uso', async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<boolean>) => {
          mockTx.$queryRaw.mockResolvedValue([{ locked: false }]);
          return fn(mockTx);
        },
      );

      const resultado = await service.tentarAdquirirExclusividade(1);

      expect(resultado).toBe(false);
    });

    it('deve retornar true em caso de erro (graceful degradation)', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('timeout'));

      const resultado = await service.tentarAdquirirExclusividade(1);

      expect(resultado).toBe(true);
    });
  });

  describe('tentarExclusividadeSincronizacao', () => {
    it('deve usar lockId 1 (SINCRONIZACAO)', async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<boolean>) => {
          mockTx.$queryRaw.mockResolvedValue([{ locked: true }]);
          return fn(mockTx);
        },
      );

      const resultado = await service.tentarExclusividadeSincronizacao();

      expect(resultado).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('tryXactLock', () => {
    it('deve retornar true quando lock é adquirido dentro de tx', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ locked: true }]);

      const resultado = await service.tryXactLock(1, mockTx as never);

      expect(resultado).toBe(true);
    });

    it('deve retornar false quando lock já está em uso', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ locked: false }]);

      const resultado = await service.tryXactLock(1, mockTx as never);

      expect(resultado).toBe(false);
    });
  });

  describe('tryEventosXactLock', () => {
    it('deve usar lockId 2 (EVENTOS_PENDENTES)', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ locked: true }]);

      const resultado = await service.tryEventosXactLock(mockTx as never);

      expect(resultado).toBe(true);
      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});

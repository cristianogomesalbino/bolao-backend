import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LOCK_IDS } from '../scheduler.constants';

/**
 * Service para advisory locks via PostgreSQL.
 * Usa pg_try_advisory_xact_lock (transacional) para evitar problemas com connection pooling.
 * O lock é liberado automaticamente ao fim da transação.
 */
@Injectable()
export class AdvisoryLockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tenta adquirir lock transacional. Deve ser chamado DENTRO de $transaction.
   * Retorna true se obteve o lock, false se já está em uso.
   */
  async tryXactLock(
    lockId: number,
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<boolean> {
    const result = await tx.$queryRaw<[{ locked: boolean }]>`
      SELECT pg_try_advisory_xact_lock(${lockId}) as locked
    `;
    return result[0].locked;
  }

  /**
   * Atalho para lock de sincronização.
   */
  async trySincronizacaoLock(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<boolean> {
    return this.tryXactLock(LOCK_IDS.SINCRONIZACAO, tx);
  }

  /**
   * Atalho para lock de eventos pendentes.
   */
  async tryEventosLock(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<boolean> {
    return this.tryXactLock(LOCK_IDS.EVENTOS_PENDENTES, tx);
  }
}

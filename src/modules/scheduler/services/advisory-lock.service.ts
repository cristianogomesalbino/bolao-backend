import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LOCK_IDS } from '../scheduler.constants';

/**
 * Service para exclusividade de execução entre instâncias.
 *
 * ESTRATÉGIA DE LOCKING:
 * Em ambientes com PgBouncer em modo transacional (ex: Supabase pooler porta 6543),
 * advisory locks session-level NÃO funcionam — a conexão pode mudar entre queries,
 * e o lock é perdido quando a conexão retorna ao pool.
 *
 * Advisory locks transacionais (xact) funcionam, mas exigem manter a transação
 * aberta durante toda a operação — inviável para sync com chamadas HTTP externas.
 *
 * Solução adotada:
 * 1. Flag in-memory `executando` no use case — evita reentrância local
 * 2. Advisory lock xact como verificação pontual (best-effort entre instâncias)
 * 3. Idempotência dos efeitos derivados — garante segurança com execuções sobrepostas
 *
 * A estratégia atual assume execução em uma única instância.
 * Caso a aplicação seja escalada horizontalmente, deverá ser implementado
 * um mecanismo de lock distribuído (ex: tabela SchedulerLock com SELECT FOR UPDATE SKIP LOCKED).
 */
@Injectable()
export class AdvisoryLockService {
  private readonly logger = new Logger(AdvisoryLockService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tenta verificar se outra instância está executando.
   * Usa advisory lock transacional (funciona com PgBouncer transacional).
   * O lock vive apenas durante a transação curta de verificação.
   *
   * IMPORTANTE: Este lock NÃO persiste durante toda a sync.
   * É um check pontual de "alguém está executando agora?".
   * A proteção real contra duplicidade vem da flag in-memory +
   * idempotência dos efeitos derivados.
   */
  async tentarAdquirirExclusividade(lockId: number): Promise<boolean> {
    try {
      const resultado = await this.prisma.$transaction(
        async (tx) => {
          const result = await tx.$queryRaw<[{ locked: boolean }]>`
            SELECT pg_try_advisory_xact_lock(${lockId}) as locked
          `;
          return result[0].locked;
        },
        { timeout: 3000 },
      );
      return resultado;
    } catch {
      // Se falhar a verificação (ex: timeout), permitir execução
      // A idempotência garante segurança mesmo sem o lock
      this.logger.warn(
        '[LOCK] Falha ao verificar exclusividade — prosseguindo',
      );
      return true;
    }
  }

  /**
   * Atalho para verificar exclusividade da sincronização.
   */
  async tentarExclusividadeSincronizacao(): Promise<boolean> {
    return this.tentarAdquirirExclusividade(LOCK_IDS.SINCRONIZACAO);
  }

  /**
   * Lock transacional para uso dentro de $transaction.
   * Ideal para operações curtas (ex: processar eventos pendentes).
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
   * Lock transacional para eventos pendentes.
   */
  async tryEventosXactLock(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<boolean> {
    return this.tryXactLock(LOCK_IDS.EVENTOS_PENDENTES, tx);
  }
}

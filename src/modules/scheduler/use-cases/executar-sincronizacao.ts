import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdvisoryLockService } from '../services/advisory-lock.service';
import {
  LOCK_IDS,
  SCHEDULER,
  type TriggerOrigem,
} from '../scheduler.constants';
import { JogoService } from '../../jogos/services/jogo.service';
import {
  obterCampeonatoConfig,
  CAMPEONATO_CONFIGS,
} from '../../jogos/jogos.constants';

/**
 * Input para executar sincronização.
 */
export interface ExecutarSincronizacaoInput {
  readonly trigger: TriggerOrigem;
  readonly campeonatoSlug?: string;
  readonly faseId?: string;
}

/**
 * Output da execução.
 */
export interface ExecutarSincronizacaoOutput {
  readonly syncId: string;
  readonly trigger: TriggerOrigem;
  readonly duracaoMs: number;
  readonly sincronizados: number;
  readonly falhas: number;
  readonly ignorado: boolean;
}

/**
 * Use case unificado de sincronização.
 * Qualquer trigger (CRON, SUPER_ADMIN, API_KEY) chama este execute().
 *
 * Responsabilidades:
 * - Gerar syncId
 * - Adquirir advisory lock (pg_try_advisory_xact_lock)
 * - Delegar sincronização pro JogoService
 * - Registrar resultado
 */
@Injectable()
export class ExecutarSincronizacao {
  private readonly logger = new Logger(ExecutarSincronizacao.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: AdvisoryLockService,
    private readonly jogoService: JogoService,
  ) {}

  async execute(
    input: ExecutarSincronizacaoInput,
  ): Promise<ExecutarSincronizacaoOutput> {
    const syncId = randomUUID();
    const inicio = Date.now();

    // Tentar adquirir lock dentro de transação
    const resultado = await this.prisma.$transaction(async (tx) => {
      const obteveLock = await this.lockService.tryXactLock(
        LOCK_IDS.SINCRONIZACAO,
        tx,
      );

      if (!obteveLock) {
        this.logger.log(
          `[SCHEDULER:${syncId}] ${input.trigger} → ${SCHEDULER.MENSAGENS.SYNC_JA_EM_EXECUCAO}`,
        );
        return { sincronizados: 0, falhas: 0, ignorado: true };
      }

      this.logger.log(
        `[SCHEDULER:${syncId}] ${input.trigger} → iniciando sincronização`,
      );

      return this.executarSync(input, syncId);
    });

    const duracaoMs = Date.now() - inicio;

    if (!resultado.ignorado) {
      this.logger.log(
        `[SCHEDULER:${syncId}] Concluído: ${resultado.sincronizados} sincronizados, ${resultado.falhas} falhas, ${duracaoMs}ms`,
      );
    }

    return {
      syncId,
      trigger: input.trigger,
      duracaoMs,
      sincronizados: resultado.sincronizados,
      falhas: resultado.falhas,
      ignorado: resultado.ignorado,
    };
  }

  private async executarSync(
    input: ExecutarSincronizacaoInput,
    syncId: string,
  ): Promise<{ sincronizados: number; falhas: number; ignorado: boolean }> {
    let totalSincronizados = 0;
    let totalFalhas = 0;

    const slugs = input.campeonatoSlug
      ? [input.campeonatoSlug]
      : Object.keys(CAMPEONATO_CONFIGS);

    for (const slug of slugs) {
      try {
        const config = obterCampeonatoConfig(slug);
        const faseSlug = config.fases[0]?.slug;
        if (!faseSlug) continue;

        const faseId = input.faseId ?? (await this.resolverFaseId(slug));
        if (!faseId) continue;

        const resultado = await this.jogoService.sincronizarPlacares(
          faseId,
          slug,
          faseSlug,
        );

        totalSincronizados += resultado.sincronizados;
      } catch (error: unknown) {
        totalFalhas++;
        const msg =
          error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.warn(`[SCHEDULER:${syncId}] Falha em ${slug}: ${msg}`);
      }
    }

    return {
      sincronizados: totalSincronizados,
      falhas: totalFalhas,
      ignorado: false,
    };
  }

  /**
   * Resolve o faseId do banco para um campeonato.
   * Busca a primeira fase da temporada mais recente.
   */
  private async resolverFaseId(campeonatoSlug: string): Promise<string | null> {
    const fase = await this.prisma.fase.findFirst({
      where: {
        temporada: {
          campeonato: {
            nome: {
              contains: campeonatoSlug.includes('copa')
                ? 'Copa'
                : 'Brasileirão',
            },
          },
        },
      },
      orderBy: { temporada: { ano: 'desc' } },
      select: { id: true },
    });
    return fase?.id ?? null;
  }
}

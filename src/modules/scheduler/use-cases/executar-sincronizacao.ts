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
 * Usa advisory lock para garantir exclusividade:
 * - Tenta lock dentro de transação curta (apenas para verificar)
 * - Se obteve, executa sync fora da transação (API externa pode demorar)
 * - Flag in-memory previne concorrência no mesmo processo
 */
@Injectable()
export class ExecutarSincronizacao {
  private readonly logger = new Logger(ExecutarSincronizacao.name);
  private executando = false;

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

    // Guard in-memory — impede concorrência no mesmo processo
    if (this.executando) {
      this.logger.log(
        `[SCHEDULER:${syncId}] ${input.trigger} → ${SCHEDULER.MENSAGENS.SYNC_JA_EM_EXECUCAO}`,
      );
      return this.buildOutput(syncId, input.trigger, inicio, 0, 0, true);
    }

    // Tentar advisory lock (transação curta apenas para checar)
    const obteveLock = await this.tentarAdvisoryLock();
    if (!obteveLock) {
      this.logger.log(
        `[SCHEDULER:${syncId}] ${input.trigger} → ${SCHEDULER.MENSAGENS.SYNC_JA_EM_EXECUCAO} (outra instância)`,
      );
      return this.buildOutput(syncId, input.trigger, inicio, 0, 0, true);
    }

    this.executando = true;
    this.logger.log(
      `[SCHEDULER:${syncId}] ${input.trigger} → iniciando sincronização`,
    );

    try {
      const resultado = await this.executarSync(input, syncId);
      const duracaoMs = Date.now() - inicio;

      this.logger.log(
        `[SCHEDULER:${syncId}] Concluído: ${resultado.sincronizados} sincronizados, ${resultado.falhas} falhas, ${duracaoMs}ms`,
      );

      return this.buildOutput(
        syncId,
        input.trigger,
        inicio,
        resultado.sincronizados,
        resultado.falhas,
        false,
      );
    } finally {
      this.executando = false;
    }
  }

  private async tentarAdvisoryLock(): Promise<boolean> {
    const resultado = await this.prisma.$transaction(
      async (tx) => this.lockService.tryXactLock(LOCK_IDS.SINCRONIZACAO, tx),
      { timeout: 3000 },
    );
    return resultado;
  }

  private async executarSync(
    input: ExecutarSincronizacaoInput,
    syncId: string,
  ): Promise<{ sincronizados: number; falhas: number }> {
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

    return { sincronizados: totalSincronizados, falhas: totalFalhas };
  }

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

  private buildOutput(
    syncId: string,
    trigger: TriggerOrigem,
    inicio: number,
    sincronizados: number,
    falhas: number,
    ignorado: boolean,
  ): ExecutarSincronizacaoOutput {
    return {
      syncId,
      trigger,
      duracaoMs: Date.now() - inicio,
      sincronizados,
      falhas,
      ignorado,
    };
  }
}

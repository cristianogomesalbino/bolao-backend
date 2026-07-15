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

    try {
      const resultado = await this.executarSync(input, syncId);
      const duracaoMs = Date.now() - inicio;

      // Só loga quando há mudanças ou falhas — ciclos sem novidade ficam silenciosos
      if (resultado.sincronizados > 0 || resultado.falhas > 0) {
        this.logger.log(
          `[SCHEDULER:${syncId}] ${input.trigger} → ${resultado.sincronizados} sincronizados, ${resultado.falhas} falhas, ${duracaoMs}ms`,
        );
      }

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
        const faseIdsProcessados = new Set<string>();

        for (const faseConfig of config.fases) {
          const resolvedId = await this.resolverFaseId(slug, faseConfig.slug);
          const faseId = input.faseId ?? resolvedId;
          if (!faseId) continue;
          if (faseIdsProcessados.has(faseId)) continue;
          faseIdsProcessados.add(faseId);

          const resultado = await this.jogoService.sincronizarPlacares(
            faseId,
            slug,
            faseConfig.slug,
          );

          totalSincronizados += resultado.sincronizados;
        }
      } catch (error: unknown) {
        totalFalhas++;
        const msg =
          error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.warn(`[SCHEDULER:${syncId}] Falha em ${slug}: ${msg}`);
      }
    }

    return { sincronizados: totalSincronizados, falhas: totalFalhas };
  }

  private async resolverFaseId(
    campeonatoSlug: string,
    faseSlug: string,
  ): Promise<string | null> {
    const nomeBusca = campeonatoSlug.includes('copa') ? 'Copa' : 'Brasileirão';

    const fase = await this.prisma.fase.findFirst({
      where: {
        temporada: {
          campeonato: { nome: { contains: nomeBusca } },
        },
        nome: { contains: this.extrairNomeFase(faseSlug) },
      },
      orderBy: { temporada: { ano: 'desc' } },
      select: { id: true },
    });

    // Fallback: buscar qualquer fase da temporada mais recente
    if (!fase) {
      const fallback = await this.prisma.fase.findFirst({
        where: {
          temporada: {
            campeonato: { nome: { contains: nomeBusca } },
          },
        },
        orderBy: { temporada: { ano: 'desc' } },
        select: { id: true },
      });
      return fallback?.id ?? null;
    }

    return fase.id;
  }

  private extrairNomeFase(faseSlug: string): string {
    if (faseSlug.includes('fase-de-grupos')) return 'Grupo';
    if (faseSlug.includes('segunda-fase')) return '16 Avos';
    if (faseSlug.includes('oitavas')) return 'Oitavas';
    if (faseSlug.includes('quartas')) return 'Quartas';
    if (faseSlug.includes('semifinal')) return 'Semifin';
    if (faseSlug.includes('terceiro')) return 'Terceiro';
    if (faseSlug.includes('final-copa')) return 'Final';
    if (faseSlug.includes('fase-unica')) return 'Fase';
    return '';
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

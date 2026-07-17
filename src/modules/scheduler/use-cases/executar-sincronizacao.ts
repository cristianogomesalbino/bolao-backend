import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AdvisoryLockService } from '../services/advisory-lock.service';
import { SCHEDULER, type TriggerOrigem } from '../scheduler.constants';
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
 * Estratégia de exclusividade:
 * - Flag in-memory `executando`: evita reentrância na mesma instância (otimização local).
 * - pg_try_advisory_xact_lock: verificação pontual entre instâncias (best-effort).
 *   NÃO persiste durante toda a sync — apenas detecta se outra instância iniciou recentemente.
 * - Idempotência dos efeitos derivados: garante segurança mesmo com execuções sobrepostas.
 *
 * A estratégia atual assume execução em uma única instância.
 * Caso a aplicação seja escalada horizontalmente, deverá ser implementado
 * um mecanismo de lock distribuído (ex: tabela SchedulerLock com row-level locking).
 */
@Injectable()
export class ExecutarSincronizacao {
  private readonly logger = new Logger(ExecutarSincronizacao.name);

  /**
   * Flag local — evita reentrância na mesma instância (otimização).
   * NÃO garante exclusividade entre instâncias. Para isso, depende do
   * advisory lock + idempotência dos efeitos.
   */
  private executando = false;

  constructor(
    private readonly lockService: AdvisoryLockService,
    private readonly jogoService: JogoService,
  ) {}

  async execute(
    input: ExecutarSincronizacaoInput,
  ): Promise<ExecutarSincronizacaoOutput> {
    const syncId = randomUUID();
    const inicio = Date.now();

    // Guard in-memory — otimização local (não é mutex entre instâncias)
    if (this.executando) {
      this.logger.log(
        `[SCHEDULER:${syncId}] ${input.trigger} → ${SCHEDULER.MENSAGENS.SYNC_JA_EM_EXECUCAO}`,
      );
      return this.buildOutput(syncId, input.trigger, inicio, 0, 0, true);
    }

    // Advisory lock transacional — check pontual de exclusividade entre instâncias.
    // Não persiste durante a sync (PgBouncer transacional não suporta session-level).
    // A idempotência dos efeitos garante segurança mesmo com execuções sobrepostas.
    const obteveLock = await this.lockService.tentarExclusividadeSincronizacao();
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

      if (resultado.sincronizados > 0 || resultado.falhas > 0) {
        this.logger.log(
          `[SCHEDULER:${syncId}] ${input.trigger} → ${resultado.sincronizados} sincronizados, ${resultado.falhas} falhas, ${duracaoMs}ms`,
        );
      }

      // Diagnóstico: delega pro JogoService contar atrasados (sem acesso direto ao banco)
      if (resultado.sincronizados === 0 && resultado.falhas === 0) {
        const atrasados = await this.jogoService.contarJogosAtrasados();
        if (atrasados > 0) {
          this.logger.warn(
            `[SCHEDULER:${syncId}] ⚠️ ${atrasados} jogo(s) atrasado(s) detectado(s) mas 0 sincronizados — possível falha de match com API`,
          );
        }
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
        const sincronizados = await this.sincronizarCampeonato(slug, input);
        totalSincronizados += sincronizados;
      } catch (error: unknown) {
        totalFalhas++;
        const msg =
          error instanceof Error ? error.message : 'Erro desconhecido';
        this.logger.warn(`[SCHEDULER:${syncId}] Falha em ${slug}: ${msg}`);
      }
    }

    return { sincronizados: totalSincronizados, falhas: totalFalhas };
  }

  private async sincronizarCampeonato(
    slug: string,
    input: ExecutarSincronizacaoInput,
  ): Promise<number> {
    const config = obterCampeonatoConfig(slug);
    const faseIdsProcessados = new Set<string>();
    let sincronizados = 0;

    for (const faseConfig of config.fases) {
      const resolvedId = await this.jogoService.resolverFaseIdParaSync(
        slug,
        faseConfig.slug,
      );
      const faseId = input.faseId ?? resolvedId;
      if (!faseId) continue;
      if (faseIdsProcessados.has(faseId)) continue;
      faseIdsProcessados.add(faseId);

      const resultado = await this.jogoService.sincronizarPlacares(
        faseId,
        slug,
        faseConfig.slug,
      );

      sincronizados += resultado.sincronizados;
    }

    return sincronizados;
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

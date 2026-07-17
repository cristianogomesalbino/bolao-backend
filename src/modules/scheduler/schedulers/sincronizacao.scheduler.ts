import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutarSincronizacao } from '../use-cases/executar-sincronizacao';
import {
  SyncPolicyService,
  type EstadoJogos,
} from '../services/sync-policy.service';
import { JogoService } from '../../jogos/services/jogo.service';
import { SYNC_INTERVALOS } from '../scheduler.constants';

/** Timeout máximo para uma execução de sync (evita travar o ciclo) */
const SYNC_TIMEOUT_MS = 60 * 1000; // 60 segundos

/**
 * Scheduler de sincronização com política adaptativa.
 * Usa setTimeout em vez de cron fixo — intervalo depende do estado dos jogos.
 *
 * Proteções contra travamento:
 * - Timeout de 60s por execução (evita promise pendurada travar ciclo)
 * - Sempre reagenda próximo ciclo, mesmo em caso de erro
 *
 * NOTA: Este scheduler apenas orquestra. Não acessa banco diretamente.
 * Estado dos jogos é obtido via JogoService.detectarEstadoParaSync().
 */
@Injectable()
export class SincronizacaoScheduler implements OnModuleInit {
  private readonly logger = new Logger(SincronizacaoScheduler.name);
  private readonly habilitada: boolean;
  private readonly campeonatos: string;
  private timeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly executarSincronizacao: ExecutarSincronizacao,
    private readonly syncPolicy: SyncPolicyService,
    private readonly configService: ConfigService,
    private readonly jogoService: JogoService,
  ) {
    this.habilitada =
      this.configService.get<string>('SYNC_AUTOMATICA_HABILITADA') === 'true';
    this.campeonatos = this.configService.get<string>('SYNC_CAMPEONATOS') ?? '';
  }

  onModuleInit() {
    if (!this.habilitada) {
      this.logger.warn('[SYNC-SCHEDULER] Desabilitado');
      return;
    }

    this.logger.log(
      `[SYNC-SCHEDULER] Habilitado para: ${this.campeonatos || 'todos'}`,
    );
    setTimeout(() => {
      void this.ciclo();
    }, SYNC_INTERVALOS.STARTUP_DELAY_MS);
  }

  private async ciclo(): Promise<void> {
    try {
      await this.executarComTimeout();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro';
      this.logger.error(`[SYNC-SCHEDULER] Erro no ciclo: ${msg}`);
    }

    // SEMPRE reagendar, mesmo após erro — nunca parar o ciclo
    try {
      const estado = await this.detectarEstado();
      const intervalo = this.syncPolicy.calcularIntervalo(estado);
      this.logarProximaExecucao(estado, intervalo);
      this.timeout = setTimeout(() => {
        void this.ciclo();
      }, intervalo);
    } catch {
      this.logger.error(
        '[SYNC-SCHEDULER] Erro ao detectar estado — reagendando em 2min',
      );
      this.timeout = setTimeout(() => {
        void this.ciclo();
      }, SYNC_INTERVALOS.AO_VIVO_MS);
    }
  }

  /**
   * Executa sincronização com timeout de proteção.
   * Evita que uma promise pendurada (API externa sem resposta) trave o ciclo.
   */
  private async executarComTimeout(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Sync timeout — ciclo travado por 60s')),
        SYNC_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([
        this.executarSincronizacao.execute({ trigger: 'CRON' }),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private logarProximaExecucao(estado: EstadoJogos, intervalo: number): void {
    const minutos = Math.round(intervalo / 60000);

    if (estado.jogosEmAndamento > 0) {
      return;
    }

    if (estado.proximoJogoEm === null) {
      this.logger.log(
        `[SYNC-SCHEDULER] 😴 Sem jogos próximos → próxima em ${minutos}min`,
      );
      return;
    }

    const info = estado.proximoJogoInfo;
    const jogoLabel = info
      ? `${info.timeCasa} x ${info.timeFora} às ${info.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`
      : '';

    if (estado.proximoJogoEm <= SYNC_INTERVALOS.ANTECEDENCIA_MS) {
      const minAteJogo = Math.round(estado.proximoJogoEm / 60000);
      this.logger.log(
        `[SYNC-SCHEDULER] 🏟️ Jogo iminente: ${jogoLabel} (em ${minAteJogo}min)`,
      );
    } else {
      const horasAteJogo =
        Math.round((estado.proximoJogoEm / 3600000) * 10) / 10;
      this.logger.log(
        `[SYNC-SCHEDULER] ⏳ Próximo: ${jogoLabel} (em ${horasAteJogo}h) → dormindo ${minutos}min`,
      );
    }
  }

  /**
   * Detecta estado dos jogos via JogoService (sem acesso direto ao banco).
   */
  private async detectarEstado(): Promise<EstadoJogos> {
    return this.jogoService.detectarEstadoParaSync();
  }

  obterEstado(): { habilitada: boolean; proximoTimeout: boolean } {
    return {
      habilitada: this.habilitada,
      proximoTimeout: this.timeout !== null,
    };
  }
}

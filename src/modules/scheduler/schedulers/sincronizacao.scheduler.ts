import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutarSincronizacao } from '../use-cases/executar-sincronizacao';
import {
  SyncPolicyService,
  type EstadoJogos,
} from '../services/sync-policy.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SYNC_INTERVALOS } from '../scheduler.constants';

/**
 * Scheduler de sincronização com política adaptativa.
 * Usa setTimeout em vez de cron fixo — intervalo depende do estado dos jogos.
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
    private readonly prisma: PrismaService,
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
      await this.executarSincronizacao.execute({ trigger: 'CRON' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro';
      this.logger.error(`[SYNC-SCHEDULER] Erro no ciclo: ${msg}`);
    }

    const estado = await this.detectarEstado();
    const intervalo = this.syncPolicy.calcularIntervalo(estado);
    this.logarProximaExecucao(estado, intervalo);
    this.timeout = setTimeout(() => {
      void this.ciclo();
    }, intervalo);
  }

  private logarProximaExecucao(estado: EstadoJogos, intervalo: number): void {
    const minutos = Math.round(intervalo / 60000);

    if (estado.jogosEmAndamento > 0) {
      // Quando ao vivo, não loga a cada 2min — o log de sync já mostra mudanças
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
      const msParaHoras = estado.proximoJogoEm / 3600000;
      const horasAteJogo = Math.round(msParaHoras * 10) / 10;
      this.logger.log(
        `[SYNC-SCHEDULER] ⏳ Próximo: ${jogoLabel} (em ${horasAteJogo}h) → dormindo ${minutos}min`,
      );
    }
  }

  private async detectarEstado(): Promise<EstadoJogos> {
    const emAndamento = await this.prisma.jogo.count({
      where: {
        status: 'EM_ANDAMENTO',
        fonteResultado: 'API_EXTERNA',
      },
    });

    const atrasados = await this.prisma.jogo.count({
      where: {
        status: 'AGENDADO',
        fonteResultado: 'API_EXTERNA',
        dataHora: { not: null, lte: new Date() },
      },
    });

    const proximoJogo = await this.prisma.jogo.findFirst({
      where: {
        status: 'AGENDADO',
        fonteResultado: 'API_EXTERNA',
        dataHora: { gt: new Date() },
      },
      orderBy: { dataHora: 'asc' },
      select: {
        dataHora: true,
        timeCasa: { select: { sigla: true } },
        timeFora: { select: { sigla: true } },
      },
    });

    const proximoJogoEm = proximoJogo?.dataHora
      ? proximoJogo.dataHora.getTime() - Date.now()
      : null;

    const proximoJogoInfo = proximoJogo?.dataHora
      ? {
          timeCasa: proximoJogo.timeCasa?.sigla ?? '?',
          timeFora: proximoJogo.timeFora?.sigla ?? '?',
          dataHora: proximoJogo.dataHora,
        }
      : null;

    return {
      jogosEmAndamento: emAndamento + atrasados,
      proximoJogoEm,
      proximoJogoInfo,
    };
  }

  obterEstado(): { habilitada: boolean; proximoTimeout: boolean } {
    return {
      habilitada: this.habilitada,
      proximoTimeout: this.timeout !== null,
    };
  }
}

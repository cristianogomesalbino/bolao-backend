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

    const intervalo = await this.calcularProximoIntervalo();
    this.timeout = setTimeout(() => {
      void this.ciclo();
    }, intervalo);
  }

  private async calcularProximoIntervalo(): Promise<number> {
    const estado = await this.detectarEstado();
    return this.syncPolicy.calcularIntervalo(estado);
  }

  private async detectarEstado(): Promise<EstadoJogos> {
    const [emAndamento, atrasados, proximoJogo] = await Promise.all([
      this.prisma.jogo.count({
        where: {
          status: 'EM_ANDAMENTO',
          fonteResultado: 'API_EXTERNA',
        },
      }),
      this.prisma.jogo.count({
        where: {
          status: 'AGENDADO',
          fonteResultado: 'API_EXTERNA',
          dataHora: { not: null, lte: new Date() },
        },
      }),
      this.prisma.jogo.findFirst({
        where: {
          status: 'AGENDADO',
          fonteResultado: 'API_EXTERNA',
          dataHora: { gt: new Date() },
        },
        orderBy: { dataHora: 'asc' },
        select: { dataHora: true },
      }),
    ]);

    const proximoJogoEm = proximoJogo?.dataHora
      ? proximoJogo.dataHora.getTime() - Date.now()
      : null;

    return {
      jogosEmAndamento: emAndamento + atrasados,
      proximoJogoEm,
    };
  }

  obterEstado(): { habilitada: boolean; proximoTimeout: boolean } {
    return {
      habilitada: this.habilitada,
      proximoTimeout: this.timeout !== null,
    };
  }
}

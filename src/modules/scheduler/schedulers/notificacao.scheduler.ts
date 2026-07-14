import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExecutarNotificacoes } from '../use-cases/executar-notificacoes';

/**
 * Scheduler de notificações com @Cron fixo.
 * Delega toda lógica para ExecutarNotificacoes.
 */
@Injectable()
export class NotificacaoScheduler {
  private readonly logger = new Logger(NotificacaoScheduler.name);
  private processandoPalpites = false;

  constructor(private readonly executarNotificacoes: ExecutarNotificacoes) {}

  // 08:00 BRT — agendar jogos do dia
  @Cron('0 11 * * *')
  async agendarJogosDoDia(): Promise<void> {
    await this.executarNotificacoes.agendarJogosDoDia({ trigger: 'CRON' });
  }

  // Fallback a cada 15min (08h-01h BRT)
  @Cron('*/15 11-23,0-4 * * *')
  async fallbackIminentes(): Promise<void> {
    await this.executarNotificacoes.verificarIminentes({ trigger: 'CRON' });
  }

  // A cada 30min (08h-01h BRT) — palpites pendentes
  @Cron('0,30 11-23,0-4 * * *')
  async palpitesPendentes(): Promise<void> {
    if (this.processandoPalpites) return;
    this.processandoPalpites = true;
    try {
      await this.executarNotificacoes.processarPendentes({ trigger: 'CRON' });
    } finally {
      this.processandoPalpites = false;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExecutarNotificacoes } from '../use-cases/executar-notificacoes';

/**
 * Scheduler de notificações com @Cron fixo.
 * Delega toda lógica para ExecutarNotificacoes.
 *
 * Frequências:
 * - agendarJogosDoDia: 1x/dia às 08:00 BRT
 * - verificarIminentes: 1x/hora durante horário de jogos (11h-04h UTC)
 * - processarPendentes: a cada 2h durante horário de jogos
 */
@Injectable()
export class NotificacaoScheduler {
  private processandoPalpites = false;

  constructor(private readonly executarNotificacoes: ExecutarNotificacoes) {}

  // 08:00 BRT — agendar lembretes dos jogos do dia
  @Cron('0 11 * * *')
  async agendarJogosDoDia(): Promise<void> {
    await this.executarNotificacoes.agendarJogosDoDia({ trigger: 'CRON' });
  }

  // A cada hora (08h-01h BRT) — verificar jogos iminentes
  @Cron('0 11-23,0-4 * * *')
  async verificarIminentes(): Promise<void> {
    await this.executarNotificacoes.verificarIminentes({ trigger: 'CRON' });
  }

  // A cada 2h (08h-01h BRT) — lembrete de palpites pendentes
  @Cron('0 11,13,15,17,19,21,23,1,3 * * *')
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

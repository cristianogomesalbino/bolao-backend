import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificacaoEventService } from './notificacao-event.service';
import { NotificacaoService } from './notificacao.service';

/**
 * Jobs agendados para notificações.
 * Horários configurados em NOTIFICACOES.CRON (notificacoes.constants.ts).
 * Todos em UTC (BRT = UTC - 3).
 */
@Injectable()
export class NotificacaoCronService {
  private readonly logger = new Logger(NotificacaoCronService.name);
  private processandoPalpites = false;

  constructor(
    private readonly eventService: NotificacaoEventService,
    private readonly notificacaoService: NotificacaoService,
  ) {}

  // 08:00 BRT — busca jogos do dia e agenda timers de 10min antes
  @Cron('0 11 * * *')
  async agendarNotificacoesJogosProximos(): Promise<void> {
    try {
      await this.eventService.agendarJogosDoDia();
    } catch (error) {
      this.logger.error(
        `Erro ao agendar jogos do dia: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // Fallback a cada 15min (08h-01h BRT) — cobre restarts e jogos adicionados após 08h
  @Cron('*/15 11-23,0-4 * * *')
  async fallbackJogosProximos(): Promise<void> {
    try {
      await this.eventService.verificarJogosIminentes();
    } catch (error) {
      this.logger.error(
        `Erro no fallback jogos próximos: ${(error as Error).message}`,
      );
    }
  }

  // A cada 30min (08h-01h BRT) — lembra palpites pendentes 3h antes do jogo
  @Cron('0,30 11-23,0-4 * * *')
  async verificarPalpitesPendentes(): Promise<void> {
    if (this.processandoPalpites) return;
    this.processandoPalpites = true;
    try {
      await this.eventService.processarPalpitesPendentes();
    } catch (error) {
      this.logger.error(
        `Erro no cron palpites pendentes: ${(error as Error).message}`,
        (error as Error).stack,
      );
    } finally {
      this.processandoPalpites = false;
    }
  }

  // 02:00 BRT — limpeza de notificações antigas
  @Cron('0 5 * * *')
  async limparNotificacoesAntigas(): Promise<void> {
    try {
      await this.notificacaoService.limparAntigas();
    } catch (error) {
      this.logger.error(
        `Erro na limpeza de notificações: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}

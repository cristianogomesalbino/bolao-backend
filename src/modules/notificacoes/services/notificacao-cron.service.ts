import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificacaoEventService } from './notificacao-event.service';
import { NotificacaoService } from './notificacao.service';

@Injectable()
export class NotificacaoCronService {
  private readonly logger = new Logger(NotificacaoCronService.name);
  private processandoJogosProximos = false;
  private processandoPalpites = false;

  constructor(
    private readonly eventService: NotificacaoEventService,
    private readonly notificacaoService: NotificacaoService,
  ) {}

  @Cron('*/1 * * * *')
  async verificarJogosProximos(): Promise<void> {
    if (this.processandoJogosProximos) return;
    this.processandoJogosProximos = true;
    try {
      await this.eventService.processarJogosProximos();
    } catch (error) {
      this.logger.error(
        `Erro no cron jogos próximos: ${(error as Error).message}`,
        (error as Error).stack,
      );
    } finally {
      this.processandoJogosProximos = false;
    }
  }

  @Cron('*/30 * * * *')
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

  @Cron('0 5 * * *') // 02:00 BRT = 05:00 UTC
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

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExecutarLimpeza } from '../use-cases/executar-limpeza';
import { EventoPendenteService } from '../../eventos/services/evento-pendente.service';

/**
 * Scheduler de manutenção — limpeza + processamento de eventos pendentes.
 */
@Injectable()
export class ManutencaoScheduler {
  private readonly logger = new Logger(ManutencaoScheduler.name);

  constructor(
    private readonly executarLimpeza: ExecutarLimpeza,
    private readonly eventoPendenteService: EventoPendenteService,
  ) {}

  // 02:00 BRT — limpeza diária
  @Cron('0 5 * * *')
  async limparDados(): Promise<void> {
    await this.executarLimpeza.execute({ trigger: 'CRON' });
  }

  // A cada 5min — processar eventos pendentes (outbox)
  @Cron('*/5 * * * *')
  async processarEventosPendentes(): Promise<void> {
    const resultado = await this.eventoPendenteService.processarPendentes();
    if (resultado.processados > 0 || resultado.falhas > 0) {
      this.logger.log(
        `[MANUTENCAO] Eventos: ${resultado.processados} ok, ${resultado.falhas} falhas`,
      );
    }
  }
}

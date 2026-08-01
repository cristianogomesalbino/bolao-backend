import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExecutarLimpeza } from '../use-cases/executar-limpeza';
import { EventoPendenteService } from '../../eventos/services/evento-pendente.service';
import { CAMPEONATOS } from '../../campeonatos/campeonatos.constants';
import type { CampeonatoStatusService } from '../../campeonatos/services/campeonato-status.service';

/**
 * Scheduler de manutenção — limpeza + processamento de eventos pendentes + status de campeonatos.
 */
@Injectable()
export class ManutencaoScheduler implements OnModuleInit {
  private readonly logger = new Logger(ManutencaoScheduler.name);

  constructor(
    private readonly executarLimpeza: ExecutarLimpeza,
    private readonly eventoPendenteService: EventoPendenteService,
    @Inject(CAMPEONATOS.STATUS_SERVICE_TOKEN)
    private readonly campeonatoStatusService: CampeonatoStatusService,
  ) {}

  // Ao iniciar o app — verificar campeonatos que devem ser finalizados
  async onModuleInit(): Promise<void> {
    const finalizados =
      await this.campeonatoStatusService.verificarTodosCampeonatosEmAndamento();
    if (finalizados > 0) {
      this.logger.log(
        `[STARTUP] ${finalizados} campeonato(s) finalizado(s) automaticamente`,
      );
    }
  }

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

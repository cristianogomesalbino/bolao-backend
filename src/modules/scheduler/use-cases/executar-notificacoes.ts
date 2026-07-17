import { Injectable, Logger } from '@nestjs/common';
import { type TriggerOrigem } from '../scheduler.constants';
import { NotificacaoEventService } from '../../notificacoes/services/notificacao-event.service';

interface ExecutarNotificacoesInput {
  readonly trigger: TriggerOrigem;
}

/**
 * Use case unificado para notificações agendadas.
 * Delega para NotificacaoEventService existente.
 * Logs silenciosos — só loga em erro. O EventService loga quando há ação real.
 */
@Injectable()
export class ExecutarNotificacoes {
  private readonly logger = new Logger(ExecutarNotificacoes.name);

  constructor(private readonly eventService: NotificacaoEventService) {}

  async agendarJogosDoDia(_input: ExecutarNotificacoesInput): Promise<void> {
    try {
      await this.eventService.agendarJogosDoDia();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`[NOTIFICACOES] Erro agendarJogosDoDia: ${msg}`);
    }
  }

  async verificarIminentes(_input: ExecutarNotificacoesInput): Promise<void> {
    try {
      await this.eventService.verificarJogosIminentes();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`[NOTIFICACOES] Erro verificarIminentes: ${msg}`);
    }
  }

  async processarPendentes(_input: ExecutarNotificacoesInput): Promise<void> {
    try {
      await this.eventService.processarPalpitesPendentes();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`[NOTIFICACOES] Erro processarPendentes: ${msg}`);
    }
  }

  async executarTudo(input: ExecutarNotificacoesInput): Promise<void> {
    await this.agendarJogosDoDia(input);
    await this.verificarIminentes(input);
    await this.processarPendentes(input);
  }
}

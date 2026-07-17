import { Injectable, Logger } from '@nestjs/common';
import { type TriggerOrigem } from '../scheduler.constants';
import { NotificacaoService } from '../../notificacoes/services/notificacao.service';

interface ExecutarLimpezaInput {
  readonly trigger: TriggerOrigem;
}

/**
 * Use case de limpeza de dados antigos.
 * Delega para services existentes.
 */
@Injectable()
export class ExecutarLimpeza {
  private readonly logger = new Logger(ExecutarLimpeza.name);

  constructor(private readonly notificacaoService: NotificacaoService) {}

  async execute(input: ExecutarLimpezaInput): Promise<void> {
    this.logger.log(`[LIMPEZA] ${input.trigger} → iniciando`);

    try {
      await this.notificacaoService.limparAntigas();
      this.logger.log('[LIMPEZA] Limpeza de notificações concluída');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`[LIMPEZA] Erro: ${msg}`);
    }
  }
}

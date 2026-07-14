import { Inject, Injectable, Logger } from '@nestjs/common';
import { EVENTOS, type TipoEvento } from '../eventos.constants';
import type {
  EventoPendenteRepository,
  ContagemEventos,
  EventoPendente,
} from '../repositories/evento-pendente.repository.interface';

/**
 * Service para registrar e processar eventos pendentes (outbox local).
 *
 * Responsabilidade:
 * - Registrar eventos de forma idempotente (mesma chave = não duplica)
 * - Processar pendentes delegando para processors externos
 * - Controlar retry e falha definitiva
 */
@Injectable()
export class EventoPendenteService {
  private readonly logger = new Logger(EventoPendenteService.name);

  constructor(
    @Inject(EVENTOS.REPOSITORY_TOKEN)
    private readonly repo: EventoPendenteRepository,
  ) {}

  /**
   * Registra evento de forma idempotente.
   * Se a chave já existe, retorna null (não duplica).
   */
  async registrar(
    tipo: TipoEvento,
    chaveIdempotencia: string,
    payload: Record<string, unknown>,
    syncId?: string,
  ): Promise<EventoPendente | null> {
    const evento = await this.repo.criar({
      tipo,
      chaveIdempotencia,
      payload,
      syncId,
    });

    if (!evento) {
      this.logger.debug(
        `[EVENTOS] Evento duplicado ignorado: ${chaveIdempotencia}`,
      );
      return null;
    }

    this.logger.log(`[EVENTOS] Registrado: ${tipo} | ${chaveIdempotencia}`);
    return evento;
  }

  /**
   * Processa eventos pendentes.
   * Deve ser chamado pelo ManutencaoScheduler periodicamente.
   *
   * Nota: processors serão adicionados na Task 5.
   * Por agora, marca como processado (stub para validação de fluxo).
   */
  async processarPendentes(): Promise<{
    processados: number;
    falhas: number;
  }> {
    const pendentes = await this.repo.buscarPendentes(20);
    let processados = 0;
    let falhas = 0;

    for (const evento of pendentes) {
      await this.repo.marcarProcessando(evento.id);

      try {
        // Fase 2: delegar para processor específico por tipo (ranking, notificação, chaveamento)
        await this.processar(evento);
        await this.repo.marcarProcessado(evento.id);
        processados++;
      } catch (error: unknown) {
        const mensagemErro =
          error instanceof Error ? error.message : 'Erro desconhecido';
        await this.repo.marcarFalha(
          evento.id,
          mensagemErro,
          EVENTOS.MAX_TENTATIVAS,
        );
        falhas++;
        this.logger.warn(
          `[EVENTOS] Falha ao processar ${evento.tipo}: ${mensagemErro}`,
        );
      }
    }

    if (processados > 0 || falhas > 0) {
      this.logger.log(
        `[EVENTOS] Processados: ${processados} ok, ${falhas} falhas`,
      );
    }

    return { processados, falhas };
  }

  /**
   * Conta eventos pendentes e com falha definitiva (para endpoint de status).
   */
  async contarPendentes(): Promise<ContagemEventos> {
    return this.repo.contarPendentes();
  }

  /**
   * Processa um evento individual.
   * Stub — será substituído por dispatch para processors na Task 5.
   */
  private async processar(_evento: EventoPendente): Promise<void> {
    // Processors serão injetados aqui (ranking, notificação, chaveamento)
    // Por agora, não faz nada — apenas marca como processado
  }
}

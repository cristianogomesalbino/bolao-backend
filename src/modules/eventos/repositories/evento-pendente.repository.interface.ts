import type { StatusEvento, TipoEvento } from '../eventos.constants';

/**
 * Dados para criação de um evento pendente.
 */
export interface CriarEventoPendenteData {
  readonly tipo: TipoEvento;
  readonly chaveIdempotencia: string;
  readonly payload: Record<string, unknown>;
  readonly syncId?: string;
}

/**
 * Evento pendente como retornado pelo repositório.
 */
export interface EventoPendente {
  readonly id: string;
  readonly tipo: string;
  readonly chaveIdempotencia: string;
  readonly payload: Record<string, unknown>;
  readonly status: StatusEvento;
  readonly tentativas: number;
  readonly ultimoErro: string | null;
  readonly syncId: string | null;
  readonly dataCriacao: Date;
  readonly processadoEm: Date | null;
}

/**
 * Contagem de eventos por status.
 */
export interface ContagemEventos {
  readonly pendentes: number;
  readonly falhas: number;
}

/**
 * Interface do repositório de eventos pendentes.
 */
export interface EventoPendenteRepository {
  /**
   * Cria evento se não existir (idempotente via chaveIdempotencia UNIQUE).
   * Retorna o evento criado ou null se já existia.
   */
  criar(data: CriarEventoPendenteData): Promise<EventoPendente | null>;

  /**
   * Busca eventos com status PENDENTE, ordenados por dataCriacao (mais antigos primeiro).
   */
  buscarPendentes(limite?: number): Promise<EventoPendente[]>;

  /**
   * Marca evento como PROCESSANDO (início do processamento).
   */
  marcarProcessando(id: string): Promise<void>;

  /**
   * Marca evento como PROCESSADO com timestamp.
   */
  marcarProcessado(id: string): Promise<void>;

  /**
   * Incrementa tentativas e marca falha. Se atingir max tentativas, marca FALHA_DEFINITIVA.
   */
  marcarFalha(id: string, erro: string, maxTentativas: number): Promise<void>;

  /**
   * Conta eventos pendentes e com falha definitiva.
   */
  contarPendentes(): Promise<ContagemEventos>;
}

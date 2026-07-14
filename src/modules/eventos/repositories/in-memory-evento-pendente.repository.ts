import { EVENTOS } from '../eventos.constants';
import type {
  EventoPendenteRepository,
  EventoPendente,
  CriarEventoPendenteData,
  ContagemEventos,
} from './evento-pendente.repository.interface';

/**
 * Registro mutável interno do InMemory.
 */
interface EventoInterno {
  id: string;
  tipo: string;
  chaveIdempotencia: string;
  payload: Record<string, unknown>;
  status: string;
  tentativas: number;
  ultimoErro: string | null;
  syncId: string | null;
  dataCriacao: Date;
  processadoEm: Date | null;
}

function toEventoPendente(e: EventoInterno): EventoPendente {
  return {
    id: e.id,
    tipo: e.tipo,
    chaveIdempotencia: e.chaveIdempotencia,
    payload: e.payload,
    status: e.status as EventoPendente['status'],
    tentativas: e.tentativas,
    ultimoErro: e.ultimoErro,
    syncId: e.syncId,
    dataCriacao: e.dataCriacao,
    processadoEm: e.processadoEm,
  };
}

/**
 * Implementação InMemory do repositório de eventos pendentes.
 * Usado exclusivamente em testes unitários.
 */
export class InMemoryEventoPendenteRepository implements EventoPendenteRepository {
  readonly items: EventoInterno[] = [];
  private contador = 0;

  criar(data: CriarEventoPendenteData): Promise<EventoPendente | null> {
    const existente = this.items.some(
      (e) => e.chaveIdempotencia === data.chaveIdempotencia,
    );
    if (existente) return Promise.resolve(null);

    this.contador++;
    const evento: EventoInterno = {
      id: `evt-${this.contador}`,
      tipo: data.tipo,
      chaveIdempotencia: data.chaveIdempotencia,
      payload: data.payload,
      status: EVENTOS.STATUS.PENDENTE,
      tentativas: 0,
      ultimoErro: null,
      syncId: data.syncId ?? null,
      dataCriacao: new Date(),
      processadoEm: null,
    };
    this.items.push(evento);
    return Promise.resolve(toEventoPendente(evento));
  }

  buscarPendentes(limite = 50): Promise<EventoPendente[]> {
    const resultado = this.items
      .filter((e) => e.status === EVENTOS.STATUS.PENDENTE)
      .sort((a, b) => a.dataCriacao.getTime() - b.dataCriacao.getTime())
      .slice(0, limite)
      .map(toEventoPendente);
    return Promise.resolve(resultado);
  }

  marcarProcessando(id: string): Promise<void> {
    const evento = this.items.find((e) => e.id === id);
    if (evento) {
      evento.status = EVENTOS.STATUS.PROCESSANDO;
    }
    return Promise.resolve();
  }

  marcarProcessado(id: string): Promise<void> {
    const evento = this.items.find((e) => e.id === id);
    if (evento) {
      evento.status = EVENTOS.STATUS.PROCESSADO;
      evento.processadoEm = new Date();
    }
    return Promise.resolve();
  }

  marcarFalha(id: string, erro: string, maxTentativas: number): Promise<void> {
    const evento = this.items.find((e) => e.id === id);
    if (!evento) return Promise.resolve();

    evento.tentativas += 1;
    evento.ultimoErro = erro;
    evento.status =
      evento.tentativas >= maxTentativas
        ? EVENTOS.STATUS.FALHA_DEFINITIVA
        : EVENTOS.STATUS.PENDENTE;
    return Promise.resolve();
  }

  contarPendentes(): Promise<ContagemEventos> {
    const pendentes = this.items.filter(
      (e) => e.status === EVENTOS.STATUS.PENDENTE,
    ).length;
    const falhas = this.items.filter(
      (e) => e.status === EVENTOS.STATUS.FALHA_DEFINITIVA,
    ).length;
    return Promise.resolve({ pendentes, falhas });
  }
}

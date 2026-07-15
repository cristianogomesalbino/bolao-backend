import { Injectable } from '@nestjs/common';
import { SYNC_INTERVALOS } from '../scheduler.constants';

/**
 * Estado dos jogos usado para calcular intervalo de sincronização.
 */
export interface EstadoJogos {
  readonly jogosEmAndamento: number;
  readonly proximoJogoEm: number | null; // ms até o próximo jogo (null = sem jogos)
  readonly proximoJogoInfo?: {
    readonly timeCasa: string;
    readonly timeFora: string;
    readonly dataHora: Date;
  } | null;
}

/**
 * Service com policy de frequência de sincronização.
 * Função pura: recebe estado, retorna intervalo em ms.
 * Testável isoladamente sem dependências externas.
 */
@Injectable()
export class SyncPolicyService {
  /**
   * Calcula o próximo intervalo de sync baseado no estado dos jogos.
   *
   * Regras:
   * - Jogos ao vivo → 2min (polling frequente)
   * - Próximo jogo dentro de 5min → 2min (preparar)
   * - Próximo jogo distante → acordar 5min antes (máx 2h)
   * - Sem jogos próximos → 2h
   */
  calcularIntervalo(estado: EstadoJogos): number {
    if (estado.jogosEmAndamento > 0) {
      return SYNC_INTERVALOS.AO_VIVO_MS;
    }

    if (estado.proximoJogoEm === null) {
      return SYNC_INTERVALOS.SEM_JOGOS_MS;
    }

    if (estado.proximoJogoEm <= SYNC_INTERVALOS.ANTECEDENCIA_MS) {
      return SYNC_INTERVALOS.PROXIMO_IMINENTE_MS;
    }

    // Acordar 5min antes do próximo jogo, máximo 2h
    const acordarEm = estado.proximoJogoEm - SYNC_INTERVALOS.ANTECEDENCIA_MS;
    return Math.min(acordarEm, SYNC_INTERVALOS.SEM_JOGOS_MS);
  }
}

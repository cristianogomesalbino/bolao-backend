import { describe, it, expect } from 'vitest';
import {
  SyncPolicyService,
  type EstadoJogos,
} from '@src/modules/scheduler/services/sync-policy.service';
import { SYNC_INTERVALOS } from '@src/modules/scheduler/scheduler.constants';

describe('SyncPolicyService', () => {
  const service = new SyncPolicyService();

  it('jogos ao vivo → 2 minutos', () => {
    const estado: EstadoJogos = { jogosEmAndamento: 3, proximoJogoEm: null };

    expect(service.calcularIntervalo(estado)).toBe(SYNC_INTERVALOS.AO_VIVO_MS);
  });

  it('próximo jogo dentro de 5min → 2 minutos (preparar)', () => {
    const estado: EstadoJogos = {
      jogosEmAndamento: 0,
      proximoJogoEm: 3 * 60 * 1000, // 3min
    };

    expect(service.calcularIntervalo(estado)).toBe(
      SYNC_INTERVALOS.PROXIMO_IMINENTE_MS,
    );
  });

  it('próximo jogo em exatamente 5min → 2 minutos', () => {
    const estado: EstadoJogos = {
      jogosEmAndamento: 0,
      proximoJogoEm: SYNC_INTERVALOS.ANTECEDENCIA_MS,
    };

    expect(service.calcularIntervalo(estado)).toBe(
      SYNC_INTERVALOS.PROXIMO_IMINENTE_MS,
    );
  });

  it('próximo jogo em 30min → acorda 25min antes (30min - 5min antecedência)', () => {
    const trintaMin = 30 * 60 * 1000;
    const estado: EstadoJogos = {
      jogosEmAndamento: 0,
      proximoJogoEm: trintaMin,
    };

    const esperado = trintaMin - SYNC_INTERVALOS.ANTECEDENCIA_MS; // 25min
    expect(service.calcularIntervalo(estado)).toBe(esperado);
  });

  it('próximo jogo em 5h → máximo 2h (não dorme 5h de uma vez)', () => {
    const cincoHoras = 5 * 60 * 60 * 1000;
    const estado: EstadoJogos = {
      jogosEmAndamento: 0,
      proximoJogoEm: cincoHoras,
    };

    expect(service.calcularIntervalo(estado)).toBe(
      SYNC_INTERVALOS.SEM_JOGOS_MS,
    );
  });

  it('sem jogos próximos (null) → 2 horas', () => {
    const estado: EstadoJogos = { jogosEmAndamento: 0, proximoJogoEm: null };

    expect(service.calcularIntervalo(estado)).toBe(
      SYNC_INTERVALOS.SEM_JOGOS_MS,
    );
  });

  it('jogos ao vivo tem prioridade sobre próximo jogo', () => {
    const estado: EstadoJogos = {
      jogosEmAndamento: 1,
      proximoJogoEm: 10 * 60 * 60 * 1000, // 10h
    };

    expect(service.calcularIntervalo(estado)).toBe(SYNC_INTERVALOS.AO_VIVO_MS);
  });

  it('próximo jogo em 6min → acorda em 1min (6min - 5min antecedência)', () => {
    const seisMin = 6 * 60 * 1000;
    const estado: EstadoJogos = {
      jogosEmAndamento: 0,
      proximoJogoEm: seisMin,
    };

    const esperado = seisMin - SYNC_INTERVALOS.ANTECEDENCIA_MS; // 1min
    expect(service.calcularIntervalo(estado)).toBe(esperado);
  });
});

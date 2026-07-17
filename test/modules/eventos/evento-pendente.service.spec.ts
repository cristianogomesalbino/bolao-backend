import { describe, it, expect, beforeEach } from 'vitest';
import { EventoPendenteService } from '@src/modules/eventos/services/evento-pendente.service';
import { InMemoryEventoPendenteRepository } from '@src/modules/eventos/repositories/in-memory-evento-pendente.repository';
import { EVENTOS } from '@src/modules/eventos/eventos.constants';

describe('EventoPendenteService', () => {
  let service: EventoPendenteService;
  let repo: InMemoryEventoPendenteRepository;

  beforeEach(() => {
    repo = new InMemoryEventoPendenteRepository();
    service = new EventoPendenteService(repo);
  });

  describe('registrar', () => {
    it('deve criar evento PENDENTE com dados corretos', async () => {
      const evento = await service.registrar(
        EVENTOS.TIPOS.RANKING_PROCESSAR,
        'ranking:jogo-1:grupo-1',
        { jogoId: 'jogo-1', grupoId: 'grupo-1' },
        'sync-123',
      );

      expect(evento).not.toBeNull();
      expect(evento?.tipo).toBe(EVENTOS.TIPOS.RANKING_PROCESSAR);
      expect(evento?.chaveIdempotencia).toBe('ranking:jogo-1:grupo-1');
      expect(evento?.status).toBe(EVENTOS.STATUS.PENDENTE);
      expect(evento?.syncId).toBe('sync-123');
      expect(evento?.tentativas).toBe(0);
    });

    it('deve retornar null se chave já existe (idempotente)', async () => {
      await service.registrar(
        EVENTOS.TIPOS.RANKING_PROCESSAR,
        'ranking:jogo-1:grupo-1',
        { jogoId: 'jogo-1' },
      );

      const duplicado = await service.registrar(
        EVENTOS.TIPOS.RANKING_PROCESSAR,
        'ranking:jogo-1:grupo-1',
        { jogoId: 'jogo-1' },
      );

      expect(duplicado).toBeNull();
      expect(repo.items).toHaveLength(1);
    });

    it('deve permitir mesma chave parcial com diferencial', async () => {
      await service.registrar(
        EVENTOS.TIPOS.NOTIFICACAO_ENVIAR,
        'notif:JOGO_REAGENDADO:jogo-1:user-1:2026-07-20',
        { jogoId: 'jogo-1' },
      );

      const segundo = await service.registrar(
        EVENTOS.TIPOS.NOTIFICACAO_ENVIAR,
        'notif:JOGO_REAGENDADO:jogo-1:user-1:2026-07-22',
        { jogoId: 'jogo-1' },
      );

      expect(segundo).not.toBeNull();
      expect(repo.items).toHaveLength(2);
    });
  });

  describe('processarPendentes', () => {
    it('deve processar eventos pendentes e marcar como PROCESSADO', async () => {
      await service.registrar(
        EVENTOS.TIPOS.RANKING_PROCESSAR,
        'ranking:jogo-1:grupo-1',
        { jogoId: 'jogo-1' },
      );

      const resultado = await service.processarPendentes();

      expect(resultado.processados).toBe(1);
      expect(resultado.falhas).toBe(0);
      expect(repo.items[0].status).toBe(EVENTOS.STATUS.PROCESSADO);
    });

    it('deve retornar 0 quando não há pendentes', async () => {
      const resultado = await service.processarPendentes();

      expect(resultado.processados).toBe(0);
      expect(resultado.falhas).toBe(0);
    });

    it('deve processar múltiplos eventos em ordem', async () => {
      await service.registrar(
        EVENTOS.TIPOS.RANKING_PROCESSAR,
        'ranking:jogo-1:grupo-1',
        {},
      );
      await service.registrar(
        EVENTOS.TIPOS.NOTIFICACAO_ENVIAR,
        'notif:acerto:jogo-1:user-1:ref',
        {},
      );

      const resultado = await service.processarPendentes();

      expect(resultado.processados).toBe(2);
      expect(
        repo.items.every((e) => e.status === EVENTOS.STATUS.PROCESSADO),
      ).toBe(true);
    });
  });

  describe('falha e retry', () => {
    it('deve marcar FALHA_DEFINITIVA após 3 tentativas', async () => {
      await service.registrar(
        EVENTOS.TIPOS.RANKING_PROCESSAR,
        'ranking:jogo-1:grupo-1',
        {},
      );

      const evento = repo.items[0];

      await repo.marcarFalha(evento.id, 'erro 1', EVENTOS.MAX_TENTATIVAS);
      await repo.marcarFalha(evento.id, 'erro 2', EVENTOS.MAX_TENTATIVAS);
      await repo.marcarFalha(evento.id, 'erro 3', EVENTOS.MAX_TENTATIVAS);

      expect(repo.items[0].status).toBe(EVENTOS.STATUS.FALHA_DEFINITIVA);
      expect(repo.items[0].tentativas).toBe(3);
      expect(repo.items[0].ultimoErro).toBe('erro 3');
    });

    it('deve manter PENDENTE se tentativas < max', async () => {
      await service.registrar(
        EVENTOS.TIPOS.RANKING_PROCESSAR,
        'ranking:jogo-1:grupo-1',
        {},
      );

      const evento = repo.items[0];
      await repo.marcarFalha(evento.id, 'erro temp', EVENTOS.MAX_TENTATIVAS);

      expect(repo.items[0].status).toBe(EVENTOS.STATUS.PENDENTE);
      expect(repo.items[0].tentativas).toBe(1);
    });
  });

  describe('contarPendentes', () => {
    it('deve contar pendentes e falhas corretamente', async () => {
      await service.registrar(EVENTOS.TIPOS.RANKING_PROCESSAR, 'key-1', {});
      await service.registrar(EVENTOS.TIPOS.RANKING_PROCESSAR, 'key-2', {});

      // Forçar uma falha definitiva
      const evento = repo.items[1];
      await repo.marcarFalha(evento.id, 'erro', 1); // max=1 → definitiva

      const contagem = await service.contarPendentes();

      expect(contagem.pendentes).toBe(1);
      expect(contagem.falhas).toBe(1);
    });
  });
});

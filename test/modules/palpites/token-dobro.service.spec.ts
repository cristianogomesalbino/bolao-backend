import { describe, it, expect, beforeEach } from 'vitest';
import { TokenDobroService } from '@src/modules/palpites/token-dobro.service';
import { InMemoryTokenDobroRepository } from '@src/modules/palpites/repositories/in-memory-token-dobro.repository';

describe('TokenDobroService', () => {
  let service: TokenDobroService;
  let tokenDobroRepo: InMemoryTokenDobroRepository;

  const userId = 'user-1';
  const grupoId = 'grupo-1';

  beforeEach(() => {
    tokenDobroRepo = new InMemoryTokenDobroRepository();
    service = new TokenDobroService(tokenDobroRepo);
  });

  // ==================== calcularSaldo ====================

  describe('calcularSaldo', () => {
    it('deve retornar 0 sem tokens', async () => {
      const saldo = await service.calcularSaldo(userId, grupoId);
      expect(saldo).toBe(0);
    });

    it('deve retornar saldo correto após concessões', async () => {
      await service.concederToken(userId, grupoId, 'ACERTO_EM_CHEIO', 'jogo-1');
      await service.concederToken(userId, grupoId, 'PRIMEIRO_RANKING', 'fase-1');

      const saldo = await service.calcularSaldo(userId, grupoId);
      expect(saldo).toBe(2);
    });

    it('deve retornar saldo correto após concessão e utilização', async () => {
      await service.concederToken(userId, grupoId, 'ACERTO_EM_CHEIO', 'jogo-1');
      await service.concederToken(userId, grupoId, 'PRIMEIRO_RANKING', 'fase-1');
      await service.registrarUtilizacao(userId, grupoId, 'jogo-2');

      const saldo = await service.calcularSaldo(userId, grupoId);
      expect(saldo).toBe(1);
    });

    it('deve retornar saldo correto após cancelamento', async () => {
      await service.concederToken(userId, grupoId, 'ACERTO_EM_CHEIO', 'jogo-1');
      await service.registrarUtilizacao(userId, grupoId, 'jogo-2');
      await service.registrarCancelamento(userId, grupoId, 'jogo-2');

      const saldo = await service.calcularSaldo(userId, grupoId);
      expect(saldo).toBe(1);
    });

    it('saldo deve ser independente por grupo', async () => {
      await service.concederToken(userId, grupoId, 'ACERTO_EM_CHEIO', 'jogo-1');
      await service.concederToken(userId, 'grupo-2', 'PRIMEIRO_RANKING', 'fase-1');

      const saldoGrupo1 = await service.calcularSaldo(userId, grupoId);
      const saldoGrupo2 = await service.calcularSaldo(userId, 'grupo-2');

      expect(saldoGrupo1).toBe(1);
      expect(saldoGrupo2).toBe(1);
    });
  });

  // ==================== listarHistorico ====================

  describe('listarHistorico', () => {
    it('deve retornar lista vazia sem tokens', async () => {
      const historico = await service.listarHistorico(userId, grupoId);
      expect(historico).toHaveLength(0);
    });

    it('deve retornar histórico completo', async () => {
      await service.concederToken(userId, grupoId, 'ACERTO_EM_CHEIO', 'jogo-1');
      await service.registrarUtilizacao(userId, grupoId, 'jogo-2');

      const historico = await service.listarHistorico(userId, grupoId);

      expect(historico).toHaveLength(2);
    });

    it('deve retornar histórico apenas do grupo solicitado', async () => {
      await service.concederToken(userId, grupoId, 'ACERTO_EM_CHEIO', 'jogo-1');
      await service.concederToken(userId, 'grupo-2', 'PRIMEIRO_RANKING', 'fase-1');

      const historico = await service.listarHistorico(userId, grupoId);

      expect(historico).toHaveLength(1);
      expect(historico[0].grupoId).toBe(grupoId);
    });
  });

  // ==================== concederToken ====================

  describe('concederToken', () => {
    it('deve criar token com tipo CONCESSAO e motivo correto', async () => {
      const token = await service.concederToken(userId, grupoId, 'PALPITES_COMPLETOS', 'fase-1');

      expect(token.tipo).toBe('CONCESSAO');
      expect(token.motivo).toBe('PALPITES_COMPLETOS');
      expect(token.referenciaId).toBe('fase-1');
      expect(token.usuarioId).toBe(userId);
      expect(token.grupoId).toBe(grupoId);
    });
  });

  // ==================== registrarUtilizacao ====================

  describe('registrarUtilizacao', () => {
    it('deve criar token com tipo UTILIZACAO e motivo ATIVACAO_DOBRO', async () => {
      const token = await service.registrarUtilizacao(userId, grupoId, 'jogo-1');

      expect(token.tipo).toBe('UTILIZACAO');
      expect(token.motivo).toBe('ATIVACAO_DOBRO');
    });
  });

  // ==================== registrarCancelamento ====================

  describe('registrarCancelamento', () => {
    it('deve criar token com tipo CONCESSAO e motivo CANCELAMENTO_DOBRO', async () => {
      const token = await service.registrarCancelamento(userId, grupoId, 'jogo-1');

      expect(token.tipo).toBe('CONCESSAO');
      expect(token.motivo).toBe('CANCELAMENTO_DOBRO');
    });
  });
});

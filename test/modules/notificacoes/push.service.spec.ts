import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PushService } from '../../../src/modules/notificacoes/services/push.service';
import { InMemoryInscricaoPushRepository } from '../../../src/modules/notificacoes/repositories/in-memory-inscricao-push.repository';
import { PreferenciaService } from '../../../src/modules/notificacoes/services/preferencia.service';
import { InMemoryPreferenciaRepository } from '../../../src/modules/notificacoes/repositories/in-memory-preferencia.repository';
import {
  LimiteInscricoesPushError,
  InscricaoPushNaoEncontradaError,
} from '../../../src/common/errors/domain-errors/notificacoes.errors';

describe('PushService', () => {
  let service: PushService;
  let inscricaoRepo: InMemoryInscricaoPushRepository;
  let preferenciaService: PreferenciaService;
  let preferenciaRepo: InMemoryPreferenciaRepository;

  const configService = {
    get: vi.fn().mockReturnValue(null),
  };

  beforeEach(() => {
    inscricaoRepo = new InMemoryInscricaoPushRepository();
    preferenciaRepo = new InMemoryPreferenciaRepository();
    preferenciaService = new PreferenciaService(preferenciaRepo);
    service = new PushService(
      inscricaoRepo,
      preferenciaService,
      configService as any,
    );
  });

  describe('inscrever', () => {
    it('deve criar nova inscrição', async () => {
      await service.inscrever('user-1', 'https://push.example.com/1', 'p256dh-1', 'auth-1');

      const inscricoes = await inscricaoRepo.buscarPorUsuario('user-1');
      expect(inscricoes).toHaveLength(1);
      expect(inscricoes[0].endpoint).toBe('https://push.example.com/1');
    });

    it('deve atualizar inscrição existente com mesmo endpoint', async () => {
      await service.inscrever('user-1', 'https://push.example.com/1', 'p256dh-1', 'auth-1');
      await service.inscrever('user-1', 'https://push.example.com/1', 'p256dh-2', 'auth-2');

      const inscricoes = await inscricaoRepo.buscarPorUsuario('user-1');
      expect(inscricoes).toHaveLength(1);
      expect(inscricoes[0].p256dh).toBe('p256dh-2');
    });

    it('deve rejeitar quando limite de 10 inscrições atingido', async () => {
      for (let i = 0; i < 10; i++) {
        await inscricaoRepo.criar({
          usuarioId: 'user-1',
          endpoint: `https://push.example.com/${String(i)}`,
          p256dh: `p-${String(i)}`,
          auth: `a-${String(i)}`,
        });
      }

      await expect(
        service.inscrever('user-1', 'https://push.example.com/11', 'p', 'a'),
      ).rejects.toThrow(LimiteInscricoesPushError);
    });
  });

  describe('cancelar', () => {
    it('deve remover inscrição existente', async () => {
      await inscricaoRepo.criar({
        usuarioId: 'user-1',
        endpoint: 'https://push.example.com/1',
        p256dh: 'p',
        auth: 'a',
      });

      await service.cancelar('user-1', 'https://push.example.com/1');

      const inscricoes = await inscricaoRepo.buscarPorUsuario('user-1');
      expect(inscricoes).toHaveLength(0);
    });

    it('deve lançar erro se endpoint não encontrado', async () => {
      await expect(
        service.cancelar('user-1', 'https://inexistente.com'),
      ).rejects.toThrow(InscricaoPushNaoEncontradaError);
    });
  });
});

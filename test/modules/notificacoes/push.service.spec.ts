import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { PushSubscription, RequestOptions, SendResult } from 'web-push';
import { PushService } from '../../../src/modules/notificacoes/services/push.service';
import { InMemoryInscricaoPushRepository } from '../../../src/modules/notificacoes/repositories/in-memory-inscricao-push.repository';
import { PreferenciaService } from '../../../src/modules/notificacoes/services/preferencia.service';
import { InMemoryPreferenciaRepository } from '../../../src/modules/notificacoes/repositories/in-memory-preferencia.repository';
import {
  LimiteInscricoesPushError,
  InscricaoPushNaoEncontradaError,
} from '../../../src/common/errors/domain-errors/notificacoes.errors';

const webpushMock = vi.hoisted(() => ({
  sendNotification:
    vi.fn<
      (
        subscription: PushSubscription,
        payload?: string | Buffer | null,
        options?: RequestOptions,
      ) => Promise<SendResult>
    >(),
  setVapidDetails: vi.fn(),
}));

vi.mock('web-push', () => webpushMock);

describe('PushService', () => {
  let service: PushService;
  let inscricaoRepo: InMemoryInscricaoPushRepository;
  let preferenciaService: PreferenciaService;
  let preferenciaRepo: InMemoryPreferenciaRepository;

  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    inscricaoRepo = new InMemoryInscricaoPushRepository();
    preferenciaRepo = new InMemoryPreferenciaRepository();
    preferenciaService = new PreferenciaService(preferenciaRepo);
    service = new PushService(inscricaoRepo, preferenciaService, configService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('deve expirar pushes antigos e enviar um identificador estável por usuário', async () => {
    webpushMock.sendNotification.mockResolvedValue({
      statusCode: 201,
      body: '',
      headers: {},
    });
    configService.set('VAPID_PUBLIC_KEY', 'public-key');
    configService.set('VAPID_PRIVATE_KEY', 'private-key');
    service.onModuleInit();
    await inscricaoRepo.criar({
      usuarioId: 'user-1',
      endpoint: 'https://push.example.com/1',
      p256dh: 'p256dh-1',
      auth: 'auth-1',
    });

    await service.enviarParaUsuario('user-1', {
      titulo: 'Novo aviso',
      mensagem: 'Mensagem do aviso',
      tipo: 'JOGO_PROXIMO',
      dedupeId: 'jogo:jogo-1:JOGO_PROXIMO',
    });

    expect(webpushMock.sendNotification).toHaveBeenCalledOnce();
    const [subscription, payload, options] =
      webpushMock.sendNotification.mock.calls[0];
    expect(subscription.endpoint).toBe('https://push.example.com/1');
    expect(JSON.parse(payload as string)).toMatchObject({
      dedupeId: 'jogo:jogo-1:JOGO_PROXIMO:user-1',
    });
    expect(options?.TTL).toBe(3600);
  });

  describe('inscrever', () => {
    it('deve criar nova inscrição', async () => {
      await service.inscrever(
        'user-1',
        'https://push.example.com/1',
        'p256dh-1',
        'auth-1',
      );

      const inscricoes = await inscricaoRepo.buscarPorUsuario('user-1');
      expect(inscricoes).toHaveLength(1);
      expect(inscricoes[0].endpoint).toBe('https://push.example.com/1');
    });

    it('deve atualizar inscrição existente com mesmo endpoint', async () => {
      await service.inscrever(
        'user-1',
        'https://push.example.com/1',
        'p256dh-1',
        'auth-1',
      );
      await service.inscrever(
        'user-1',
        'https://push.example.com/1',
        'p256dh-2',
        'auth-2',
      );

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

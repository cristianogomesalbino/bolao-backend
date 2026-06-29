import { describe, it, expect, beforeEach } from 'vitest';
import { NotificacaoService } from '../../../src/modules/notificacoes/services/notificacao.service';
import { InMemoryNotificacaoRepository } from '../../../src/modules/notificacoes/repositories/in-memory-notificacao.repository';
import { NotificacaoNaoEncontradaError } from '../../../src/common/errors/domain-errors/notificacoes.errors';

describe('NotificacaoService', () => {
  let service: NotificacaoService;
  let repo: InMemoryNotificacaoRepository;

  beforeEach(() => {
    repo = new InMemoryNotificacaoRepository();
    service = new NotificacaoService(repo);
  });

  describe('criar', () => {
    it('deve criar notificação com status NAO_LIDA', async () => {
      const resultado = await service.criar({
        tipo: 'ACERTO_EM_CHEIO',
        titulo: 'Acerto!',
        mensagem: 'Você acertou em cheio!',
        usuarioId: 'user-1',
        jogoId: 'jogo-1',
      });

      expect(resultado.id).toBeDefined();
      expect(resultado.status).toBe('NAO_LIDA');
      expect(resultado.tipo).toBe('ACERTO_EM_CHEIO');
    });
  });

  describe('criarLote', () => {
    it('deve criar múltiplas notificações', async () => {
      await service.criarLote([
        { tipo: 'JOGO_PROXIMO', titulo: 'T1', mensagem: 'M1', usuarioId: 'u1' },
        { tipo: 'JOGO_PROXIMO', titulo: 'T2', mensagem: 'M2', usuarioId: 'u2' },
      ]);

      expect(repo.items).toHaveLength(2);
    });

    it('não deve fazer nada com array vazio', async () => {
      await service.criarLote([]);
      expect(repo.items).toHaveLength(0);
    });
  });

  describe('listar', () => {
    it('deve listar notificações do usuário com paginação', async () => {
      for (let i = 0; i < 5; i++) {
        await service.criar({
          tipo: 'JOGO_PROXIMO',
          titulo: `T${String(i)}`,
          mensagem: `M${String(i)}`,
          usuarioId: 'user-1',
        });
      }
      await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'Outro',
        mensagem: 'Outro',
        usuarioId: 'user-2',
      });

      const resultado = await service.listar('user-1', { limit: 3, offset: 0 });

      expect(resultado.notificacoes).toHaveLength(3);
      expect(resultado.total).toBe(5);
      expect(resultado.naoLidas).toBe(5);
    });

    it('deve filtrar por status', async () => {
      await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T1',
        mensagem: 'M1',
        usuarioId: 'user-1',
      });
      const n2 = await service.criar({
        tipo: 'RODADA_ENCERRADA',
        titulo: 'T2',
        mensagem: 'M2',
        usuarioId: 'user-1',
      });
      await service.marcarComoLida(n2.id, 'user-1');

      const resultado = await service.listar('user-1', {
        limit: 20,
        offset: 0,
        status: 'NAO_LIDA',
      });

      expect(resultado.notificacoes).toHaveLength(1);
      expect(resultado.total).toBe(1);
    });
  });

  describe('contarNaoLidas', () => {
    it('deve retornar contagem correta', async () => {
      await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T',
        mensagem: 'M',
        usuarioId: 'user-1',
      });
      await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T',
        mensagem: 'M',
        usuarioId: 'user-1',
      });

      const contagem = await service.contarNaoLidas('user-1');
      expect(contagem).toBe(2);
    });
  });

  describe('marcarComoLida', () => {
    it('deve marcar notificação como lida', async () => {
      const notificacao = await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T',
        mensagem: 'M',
        usuarioId: 'user-1',
      });

      await service.marcarComoLida(notificacao.id, 'user-1');

      const atualizada = await repo.buscarPorId(notificacao.id);
      expect(atualizada?.status).toBe('LIDA');
      expect(atualizada?.dataLeitura).toBeDefined();
    });

    it('deve ser idempotente (marcar já lida não altera)', async () => {
      const notificacao = await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T',
        mensagem: 'M',
        usuarioId: 'user-1',
      });

      await service.marcarComoLida(notificacao.id, 'user-1');
      const primeiraLeitura = (await repo.buscarPorId(notificacao.id))?.dataLeitura;

      await service.marcarComoLida(notificacao.id, 'user-1');
      const segundaLeitura = (await repo.buscarPorId(notificacao.id))?.dataLeitura;

      expect(primeiraLeitura).toEqual(segundaLeitura);
    });

    it('deve lançar erro se notificação não pertence ao usuário', async () => {
      const notificacao = await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T',
        mensagem: 'M',
        usuarioId: 'user-1',
      });

      await expect(
        service.marcarComoLida(notificacao.id, 'user-2'),
      ).rejects.toThrow(NotificacaoNaoEncontradaError);
    });

    it('deve lançar erro se notificação não existe', async () => {
      await expect(
        service.marcarComoLida('id-inexistente', 'user-1'),
      ).rejects.toThrow(NotificacaoNaoEncontradaError);
    });
  });

  describe('marcarTodasComoLidas', () => {
    it('deve marcar todas as não lidas do usuário', async () => {
      await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T1',
        mensagem: 'M1',
        usuarioId: 'user-1',
      });
      await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T2',
        mensagem: 'M2',
        usuarioId: 'user-1',
      });
      await service.criar({
        tipo: 'JOGO_PROXIMO',
        titulo: 'T3',
        mensagem: 'M3',
        usuarioId: 'user-2',
      });

      const total = await service.marcarTodasComoLidas('user-1');

      expect(total).toBe(2);
      expect(await service.contarNaoLidas('user-1')).toBe(0);
      expect(await service.contarNaoLidas('user-2')).toBe(1);
    });
  });
});

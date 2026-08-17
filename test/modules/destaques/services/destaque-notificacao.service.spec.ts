import { describe, it, expect, beforeEach } from 'vitest';
import { DestaqueNotificacaoService } from '../../../../src/modules/destaques/services/destaque-notificacao.service';
import { InMemoryNotificacaoRepository } from '../../../../src/modules/notificacoes/repositories/in-memory-notificacao.repository';
import type { GrupoBasico, MembroComUsuario } from '../../../../src/modules/destaques/types/destaque.types';

describe('DestaqueNotificacaoService', () => {
  let service: DestaqueNotificacaoService;
  let notificacaoRepo: InMemoryNotificacaoRepository;

  const grupo: GrupoBasico = {
    id: 'grupo-1',
    nome: 'Bolão da Firma',
    temporadaId: 'temp-1',
    permitirPalpiteDobrado: false,
  };

  const membros: MembroComUsuario[] = [
    {
      usuarioId: 'user-1',
      grupoId: 'grupo-1',
      usuario: { id: 'user-1', nome: 'João' },
    },
    {
      usuarioId: 'user-2',
      grupoId: 'grupo-1',
      usuario: { id: 'user-2', nome: 'Pedro' },
    },
  ];

  beforeEach(() => {
    notificacaoRepo = new InMemoryNotificacaoRepository();
    service = new DestaqueNotificacaoService(notificacaoRepo);
  });

  describe('notificarNovosDestaques', () => {
    it('deve criar notificações para os membros quando não existe duplicata', async () => {
      await service.notificarNovosDestaques(grupo, 'jogo-1', 3, membros);

      expect(notificacaoRepo.items).toHaveLength(2);
      expect(notificacaoRepo.items[0].tipo).toBe('DESTAQUES_GRUPO');
      expect(notificacaoRepo.items[0].grupoId).toBe('grupo-1');
      expect(notificacaoRepo.items[0].jogoId).toBe('jogo-1');
      expect(notificacaoRepo.items[0].usuarioId).toBe('user-1');
      expect(notificacaoRepo.items[1].usuarioId).toBe('user-2');
    });

    it('não deve criar notificação duplicada (deduplicação)', async () => {
      await service.notificarNovosDestaques(grupo, 'jogo-1', 3, membros);
      const qtdPrimeira = notificacaoRepo.items.length;

      // Segunda chamada para o mesmo grupo/jogo
      await service.notificarNovosDestaques(grupo, 'jogo-1', 2, membros);

      expect(notificacaoRepo.items).toHaveLength(qtdPrimeira);
    });

    it('deve criar para jogo diferente mesmo já tendo notificado outro jogo', async () => {
      await service.notificarNovosDestaques(grupo, 'jogo-1', 3, membros);
      await service.notificarNovosDestaques(grupo, 'jogo-2', 2, membros);

      // 2 membros × 2 jogos = 4
      expect(notificacaoRepo.items).toHaveLength(4);
    });

    it('deve incluir título e mensagem do template', async () => {
      await service.notificarNovosDestaques(grupo, 'jogo-1', 5, membros);

      expect(notificacaoRepo.items[0].titulo).toBe('Novos destaques!');
      expect(notificacaoRepo.items[0].mensagem).toContain('5 novos destaques');
      expect(notificacaoRepo.items[0].mensagem).toContain('Bolão da Firma');
    });
  });

  describe('notificarRecebeuF', () => {
    it('deve criar notificação de F recebido', async () => {
      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');

      expect(notificacaoRepo.items).toHaveLength(1);
      expect(notificacaoRepo.items[0].tipo).toBe('RECEBEU_F');
      expect(notificacaoRepo.items[0].usuarioId).toBe('user-2');
      expect(notificacaoRepo.items[0].grupoId).toBe('grupo-1');
    });

    it('não deve criar notificação duplicada de F (deduplicação)', async () => {
      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');
      await service.notificarRecebeuF('user-2', 'user-3', 'grupo-1');

      // Apenas 1 notificação pois deduplicação bloqueia a segunda
      expect(notificacaoRepo.items).toHaveLength(1);
    });

    it('deve criar notificações para destinatários diferentes', async () => {
      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');
      await service.notificarRecebeuF('user-3', 'user-1', 'grupo-1');

      expect(notificacaoRepo.items).toHaveLength(2);
    });

    it('deve incluir título e mensagem do template', async () => {
      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');

      expect(notificacaoRepo.items[0].titulo).toBe('Recebeu um F!');
      expect(notificacaoRepo.items[0].mensagem).toContain('mandou um F');
    });
  });
});

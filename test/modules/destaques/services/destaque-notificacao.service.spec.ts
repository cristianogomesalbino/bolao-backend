import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueNotificacaoService } from '../../../../src/modules/destaques/services/destaque-notificacao.service';
import { InMemoryNotificacaoRepository } from '../../../../src/modules/notificacoes/repositories/in-memory-notificacao.repository';
import { InMemoryPreferenciaRepository } from '../../../../src/modules/notificacoes/repositories/in-memory-preferencia.repository';
import { PreferenciaService } from '../../../../src/modules/notificacoes/services/preferencia.service';
import type { PushService } from '../../../../src/modules/notificacoes/services/push.service';
import type { UsuarioRepository } from '../../../../src/modules/usuarios/repositories/usuario.repository.interface';
import type {
  GrupoBasico,
  MembroComUsuario,
} from '../../../../src/modules/destaques/types/destaque.types';

describe('DestaqueNotificacaoService', () => {
  let service: DestaqueNotificacaoService;
  let notificacaoRepo: InMemoryNotificacaoRepository;
  let preferenciaRepo: InMemoryPreferenciaRepository;
  let push: {
    enviarParaUsuario: ReturnType<typeof vi.fn>;
    enviarParaUsuarios: ReturnType<typeof vi.fn>;
  };

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

  const usuarios = {
    buscarPorId: vi.fn((id: string) =>
      Promise.resolve({
        id,
        nome: id === 'user-1' ? 'João' : 'Pedro',
      }),
    ),
  };

  beforeEach(() => {
    notificacaoRepo = new InMemoryNotificacaoRepository();
    preferenciaRepo = new InMemoryPreferenciaRepository();
    push = {
      enviarParaUsuario: vi.fn(() => Promise.resolve()),
      enviarParaUsuarios: vi.fn(() => Promise.resolve()),
    };
    service = new DestaqueNotificacaoService(
      notificacaoRepo,
      usuarios as unknown as UsuarioRepository,
      new PreferenciaService(preferenciaRepo),
      push as unknown as PushService,
    );
  });

  describe('notificarNovosDestaques', () => {
    it('deve criar notificações e enviar push para quem está habilitado por padrão', async () => {
      await service.notificarNovosDestaques(grupo, 'jogo-1', 3, membros);

      expect(notificacaoRepo.items).toHaveLength(2);
      expect(notificacaoRepo.items[0].tipo).toBe('DESTAQUES_GRUPO');
      expect(notificacaoRepo.items[0].grupoId).toBe('grupo-1');
      expect(notificacaoRepo.items[0].jogoId).toBe('jogo-1');
      expect(push.enviarParaUsuarios).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        expect.objectContaining({
          tipo: 'DESTAQUES_GRUPO',
          url: '/grupos/grupo-1',
        }),
      );
    });

    it('não deve notificar quem desligou destaques do grupo', async () => {
      await preferenciaRepo.criar('user-1', { destaquesGrupo: false });

      await service.notificarNovosDestaques(grupo, 'jogo-1', 3, membros);

      expect(notificacaoRepo.items.map((item) => item.usuarioId)).toEqual([
        'user-2',
      ]);
      expect(push.enviarParaUsuarios).toHaveBeenCalledWith(
        ['user-2'],
        expect.objectContaining({ tipo: 'DESTAQUES_GRUPO' }),
      );
    });

    it('não deve criar notificação duplicada (deduplicação)', async () => {
      await service.notificarNovosDestaques(grupo, 'jogo-1', 3, membros);
      const qtdPrimeira = notificacaoRepo.items.length;

      await service.notificarNovosDestaques(grupo, 'jogo-1', 2, membros);

      expect(notificacaoRepo.items).toHaveLength(qtdPrimeira);
      expect(push.enviarParaUsuarios).toHaveBeenCalledTimes(1);
    });

    it('deve criar para jogo diferente mesmo já tendo notificado outro jogo', async () => {
      await service.notificarNovosDestaques(grupo, 'jogo-1', 3, membros);
      await service.notificarNovosDestaques(grupo, 'jogo-2', 2, membros);

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
    it('deve criar notificação com o nome de quem mandou e enviar push', async () => {
      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');

      expect(notificacaoRepo.items).toHaveLength(1);
      expect(notificacaoRepo.items[0].tipo).toBe('RECEBEU_F');
      expect(notificacaoRepo.items[0].usuarioId).toBe('user-2');
      expect(notificacaoRepo.items[0].mensagem).toBe(
        'João mandou um F pra você.',
      );
      expect(push.enviarParaUsuario).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({
          tipo: 'RECEBEU_F',
          url: '/grupos/grupo-1',
          mensagem: 'João mandou um F pra você.',
        }),
      );
    });

    it('deve agrupar os próximos Fs enquanto o aviso segue não lido', async () => {
      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');
      await service.notificarRecebeuF('user-2', 'user-3', 'grupo-1');

      expect(notificacaoRepo.items).toHaveLength(1);
      expect(notificacaoRepo.items[0].titulo).toBe('Mandaram um F!');
      expect(notificacaoRepo.items[0].mensagem).toBe('2 pessoas mandaram um F');
      expect(push.enviarParaUsuario).toHaveBeenCalledTimes(2);
    });

    it('deve criar outro aviso se o anterior já foi lido', async () => {
      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');
      await notificacaoRepo.marcarComoLida(
        notificacaoRepo.items[0].id,
        new Date(),
      );

      await service.notificarRecebeuF('user-2', 'user-3', 'grupo-1');

      expect(notificacaoRepo.items).toHaveLength(2);
      expect(notificacaoRepo.items[1].mensagem).toBe(
        'Pedro mandou um F pra você.',
      );
    });

    it('não deve notificar quem desligou recebeu F', async () => {
      await preferenciaRepo.criar('user-2', { recebeuF: false });

      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');

      expect(notificacaoRepo.items).toHaveLength(0);
      expect(push.enviarParaUsuario).not.toHaveBeenCalled();
    });

    it('deve criar notificações para destinatários diferentes', async () => {
      await service.notificarRecebeuF('user-2', 'user-1', 'grupo-1');
      await service.notificarRecebeuF('user-3', 'user-1', 'grupo-1');

      expect(notificacaoRepo.items).toHaveLength(2);
    });
  });
});

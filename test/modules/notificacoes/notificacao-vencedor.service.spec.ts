import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificacaoVencedorService } from '@src/modules/notificacoes/services/notificacao-vencedor.service';
import { InMemoryNotificacaoRepository } from '@src/modules/notificacoes/repositories/in-memory-notificacao.repository';
import type { FaseRepository } from '@src/modules/jogos/repositories/fase.repository.interface';
import type { JogoRepository } from '@src/modules/jogos/repositories/jogo.repository.interface';
import type { NotificacaoService } from '@src/modules/notificacoes/services/notificacao.service';
import type { PushService } from '@src/modules/notificacoes/services/push.service';
import type { PreferenciaService } from '@src/modules/notificacoes/services/preferencia.service';
import type { NotificacaoRankingService } from '@src/modules/notificacoes/services/notificacao-ranking.service';
import type { GrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '@src/modules/grupos/repositories/grupo.repository.interface';

function criarMocks() {
  const notificacaoService: NotificacaoService = {
    criarLote: vi.fn(),
    criar: vi.fn(),
    listar: vi.fn(),
    contarNaoLidas: vi.fn(),
    marcarComoLida: vi.fn(),
    marcarTodasComoLidas: vi.fn(),
  } as unknown as NotificacaoService;

  const pushService: PushService = {
    enviarParaUsuarios: vi.fn(),
  } as unknown as PushService;

  const preferenciaService: PreferenciaService = {
    filtrarUsuariosHabilitados: vi
      .fn()
      .mockImplementation((ids: string[]) => Promise.resolve(ids)),
  } as unknown as PreferenciaService;

  const rankingService: NotificacaoRankingService = {
    calcularRankingSemCache: vi.fn().mockResolvedValue([
      { usuarioId: 'user-1', pontuacaoTotal: 50, posicao: 1 },
      { usuarioId: 'user-2', pontuacaoTotal: 30, posicao: 2 },
    ]),
  } as unknown as NotificacaoRankingService;

  const jogoRepo: JogoRepository = {
    buscarPorFase: vi.fn().mockResolvedValue([]),
  } as unknown as JogoRepository;

  const faseRepo: FaseRepository = {
    buscarPorTemporada: vi.fn().mockResolvedValue([]),
  } as unknown as FaseRepository;

  const grupoUsuarioRepo: GrupoUsuarioRepository = {
    listarPorGrupoComUsuario: vi.fn().mockResolvedValue([
      {
        usuarioId: 'user-1',
        grupoId: 'grupo-1',
        usuario: { id: 'user-1', nome: 'João' },
      },
      {
        usuarioId: 'user-2',
        grupoId: 'grupo-1',
        usuario: { id: 'user-2', nome: 'Maria' },
      },
    ]),
  } as unknown as GrupoUsuarioRepository;

  const grupoRepo: GrupoRepository = {
    buscarPorTemporadaId: vi
      .fn()
      .mockResolvedValue([
        { id: 'grupo-1', nome: 'Amigos', temporadaId: 'temp-1' },
      ]),
  } as unknown as GrupoRepository;

  return {
    notificacaoService,
    pushService,
    preferenciaService,
    rankingService,
    jogoRepo,
    faseRepo,
    grupoUsuarioRepo,
    grupoRepo,
  };
}

describe('NotificacaoVencedorService', () => {
  let service: NotificacaoVencedorService;
  let notificacaoRepo: InMemoryNotificacaoRepository;
  let mocks: ReturnType<typeof criarMocks>;

  beforeEach(() => {
    vi.clearAllMocks();
    notificacaoRepo = new InMemoryNotificacaoRepository();
    mocks = criarMocks();

    service = new NotificacaoVencedorService(
      mocks.notificacaoService,
      mocks.pushService,
      mocks.preferenciaService,
      mocks.rankingService,
      notificacaoRepo,
      mocks.jogoRepo,
      mocks.faseRepo,
      mocks.grupoUsuarioRepo,
      mocks.grupoRepo,
    );
  });

  describe('verificarTemporadaEncerrada', () => {
    it('não deve notificar se temporada não encerrou', async () => {
      vi.mocked(mocks.faseRepo.buscarPorTemporada).mockResolvedValue([
        {
          id: 'fase-1',
          nome: 'Grupo A',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
          dataCriacao: new Date(),
          atualizadoEm: new Date(),
        },
      ]);

      vi.mocked(mocks.jogoRepo.buscarPorFase).mockResolvedValue([
        { id: 'jogo-1', faseId: 'fase-1', status: 'AGENDADO' },
      ] as never);

      await service.verificarTemporadaEncerrada({
        id: 'fase-1',
        nome: 'Grupo A',
        tipo: 'PONTOS_CORRIDOS',
        temporadaId: 'temp-1',
      });

      expect(mocks.notificacaoService.criarLote).not.toHaveBeenCalled();
    });

    it('deve notificar vencedor quando todos jogos estão encerrados', async () => {
      vi.mocked(mocks.faseRepo.buscarPorTemporada).mockResolvedValue([
        {
          id: 'fase-1',
          nome: 'Final',
          tipo: 'MATA_MATA',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
          dataCriacao: new Date(),
          atualizadoEm: new Date(),
        },
      ]);

      vi.mocked(mocks.jogoRepo.buscarPorFase).mockResolvedValue([
        { id: 'jogo-final', faseId: 'fase-1', status: 'FINALIZADO' },
      ] as never);

      await service.verificarTemporadaEncerrada({
        id: 'fase-1',
        nome: 'Final',
        tipo: 'MATA_MATA',
        temporadaId: 'temp-1',
      });

      expect(mocks.notificacaoService.criarLote).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            tipo: 'VENCEDOR_BOLAO',
            usuarioId: 'user-1',
          }),
          expect.objectContaining({
            tipo: 'VENCEDOR_BOLAO',
            usuarioId: 'user-2',
          }),
        ]),
      );
    });

    it('deve enviar mensagem diferenciada para vencedor e demais', async () => {
      vi.mocked(mocks.faseRepo.buscarPorTemporada).mockResolvedValue([
        {
          id: 'fase-1',
          nome: 'Final',
          tipo: 'MATA_MATA',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
          dataCriacao: new Date(),
          atualizadoEm: new Date(),
        },
      ]);

      vi.mocked(mocks.jogoRepo.buscarPorFase).mockResolvedValue([
        { id: 'jogo-final', faseId: 'fase-1', status: 'FINALIZADO' },
      ] as never);

      await service.verificarTemporadaEncerrada({
        id: 'fase-1',
        nome: 'Final',
        tipo: 'MATA_MATA',
        temporadaId: 'temp-1',
      });

      const chamada = vi.mocked(mocks.notificacaoService.criarLote).mock
        .calls[0][0] as Array<{ usuarioId: string; mensagem: string }>;
      const notifVencedor = chamada.find((n) => n.usuarioId === 'user-1');
      const notifOutro = chamada.find((n) => n.usuarioId === 'user-2');

      expect(notifVencedor?.mensagem).toContain('Parabéns');
      expect(notifVencedor?.mensagem).toContain('campeão');
      expect(notifOutro?.mensagem).toContain('João');
      expect(notifOutro?.mensagem).toContain('venceu');
    });

    it('não deve duplicar notificação se já foi enviada', async () => {
      vi.mocked(mocks.faseRepo.buscarPorTemporada).mockResolvedValue([
        {
          id: 'fase-1',
          nome: 'Final',
          tipo: 'MATA_MATA',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
          dataCriacao: new Date(),
          atualizadoEm: new Date(),
        },
      ]);

      vi.mocked(mocks.jogoRepo.buscarPorFase).mockResolvedValue([
        { id: 'jogo-final', faseId: 'fase-1', status: 'FINALIZADO' },
      ] as never);

      // Simular notificação já existente
      notificacaoRepo.items.push({
        id: 'notif-existente',
        tipo: 'VENCEDOR_BOLAO',
        titulo: 'Temos um campeão!',
        mensagem: 'Já enviada',
        status: 'NAO_LIDA',
        usuarioId: 'user-1',
        grupoId: 'grupo-1',
        jogoId: null,
        faseId: null,
        rodada: null,
        dataCriacao: new Date(),
        dataLeitura: null,
      });

      await service.verificarTemporadaEncerrada({
        id: 'fase-1',
        nome: 'Final',
        tipo: 'MATA_MATA',
        temporadaId: 'temp-1',
      });

      expect(mocks.notificacaoService.criarLote).not.toHaveBeenCalled();
    });

    it('deve enviar push notification para todos habilitados', async () => {
      vi.mocked(mocks.faseRepo.buscarPorTemporada).mockResolvedValue([
        {
          id: 'fase-1',
          nome: 'Final',
          tipo: 'MATA_MATA',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
          dataCriacao: new Date(),
          atualizadoEm: new Date(),
        },
      ]);

      vi.mocked(mocks.jogoRepo.buscarPorFase).mockResolvedValue([
        { id: 'jogo-final', faseId: 'fase-1', status: 'FINALIZADO' },
      ] as never);

      await service.verificarTemporadaEncerrada({
        id: 'fase-1',
        nome: 'Final',
        tipo: 'MATA_MATA',
        temporadaId: 'temp-1',
      });

      expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        expect.objectContaining({
          titulo: 'Temos um campeão!',
          tipo: 'VENCEDOR_BOLAO',
        }),
      );
    });
  });
});

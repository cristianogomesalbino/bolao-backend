import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificacaoLembreteService } from '@src/modules/notificacoes/services/notificacao-lembrete.service';
import type { NotificacaoService } from '@src/modules/notificacoes/services/notificacao.service';
import type { PushService } from '@src/modules/notificacoes/services/push.service';
import type { PreferenciaService } from '@src/modules/notificacoes/services/preferencia.service';
import type { NotificacaoRepository } from '@src/modules/notificacoes/repositories/notificacao.repository.interface';
import type { JogoRepository } from '@src/modules/jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '@src/modules/jogos/repositories/fase.repository.interface';
import type { PalpiteRepository } from '@src/modules/palpites/repositories/palpite.repository.interface';
import type { GrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '@src/modules/grupos/repositories/grupo.repository.interface';
import type { JogoNotif } from '@src/modules/notificacoes/types/notificacao.types';

function criarMocks() {
  return {
    notificacaoService: {
      criarLote: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificacaoService,
    pushService: {
      enviarParaUsuarios: vi.fn().mockResolvedValue(undefined),
      enviarParaUsuario: vi.fn().mockResolvedValue(undefined),
    } as unknown as PushService,
    preferenciaService: {
      filtrarUsuariosHabilitados: vi
        .fn()
        .mockImplementation((ids: string[]) => Promise.resolve(ids)),
    } as unknown as PreferenciaService,
    notificacaoRepo: {
      existeNotificacao: vi.fn().mockResolvedValue(false),
    } as unknown as NotificacaoRepository,
    jogoRepo: {
      buscarPorId: vi.fn().mockResolvedValue({
        id: 'jogo-1',
        faseId: 'fase-1',
        status: 'AGENDADO',
      }),
    } as unknown as JogoRepository,
    faseRepo: {
      buscarPorId: vi.fn().mockResolvedValue({
        id: 'fase-1',
        nome: 'Fase 1',
        tipo: 'PONTOS_CORRIDOS',
        temporadaId: 'temp-1',
      }),
    } as unknown as FaseRepository,
    palpiteRepo: {
      listarPorJogoEUsuarios: vi.fn().mockResolvedValue([]),
      listarPorJogosEUsuarios: vi.fn().mockResolvedValue([]),
    } as unknown as PalpiteRepository,
    grupoUsuarioRepo: {
      listarPorGrupoComUsuario: vi
        .fn()
        .mockResolvedValue([{ usuarioId: 'user-1', grupoId: 'grupo-1' }]),
    } as unknown as GrupoUsuarioRepository,
    grupoRepo: {
      buscarPorTemporadaId: vi
        .fn()
        .mockResolvedValue([
          { id: 'grupo-1', nome: 'Amigos', temporadaId: 'temp-1' },
        ]),
    } as unknown as GrupoRepository,
  };
}

describe('NotificacaoLembreteService', () => {
  let service: NotificacaoLembreteService;
  let mocks: ReturnType<typeof criarMocks>;

  const jogo: JogoNotif = {
    id: 'jogo-1',
    faseId: 'fase-1',
    rodada: 1,
    status: 'AGENDADO',
    timeCasaId: 't1',
    timeForaId: 't2',
    timeCasa: { nome: 'Flamengo' },
    timeFora: { nome: 'Palmeiras' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = criarMocks();
    service = new NotificacaoLembreteService(
      mocks.notificacaoService,
      mocks.pushService,
      mocks.preferenciaService,
      mocks.notificacaoRepo,
      mocks.jogoRepo,
      mocks.faseRepo,
      mocks.palpiteRepo,
      mocks.grupoUsuarioRepo,
      mocks.grupoRepo,
    );
  });

  it('deve notificar jogo próximo com dedupeId', async () => {
    await service.notificarJogoProximo(jogo);

    expect(mocks.grupoUsuarioRepo.listarPorGrupoComUsuario).toHaveBeenCalled();
    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledWith(
      ['user-1'],
      expect.objectContaining({
        tipo: 'JOGO_PROXIMO',
        dedupeId: 'jogo:jogo-1:JOGO_PROXIMO',
      }),
    );
  });

  it('deve notificar palpites pendentes com push individual e dedupeId', async () => {
    await service.notificarPalpitesPendentes('fase-1', 1, [jogo]);

    expect(mocks.notificacaoService.criarLote).toHaveBeenCalled();
    expect(mocks.pushService.enviarParaUsuario).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        tipo: 'PALPITES_PENDENTES',
        dedupeId: 'fase:fase-1:rodada:1:PALPITES_PENDENTES',
      }),
    );
  });

  it('deve notificar jogo liberado com dedupeId', async () => {
    await service.notificarJogoLiberado('jogo-1', 'Flamengo', 'Palmeiras');

    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledWith(
      ['user-1'],
      expect.objectContaining({
        tipo: 'JOGO_LIBERADO',
        dedupeId: 'jogo:jogo-1:JOGO_LIBERADO',
      }),
    );
  });
});

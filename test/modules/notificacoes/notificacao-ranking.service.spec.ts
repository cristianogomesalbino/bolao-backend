import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificacaoRankingService } from '@src/modules/notificacoes/services/notificacao-ranking.service';
import type { NotificacaoService } from '@src/modules/notificacoes/services/notificacao.service';
import type { PushService } from '@src/modules/notificacoes/services/push.service';
import type { PreferenciaService } from '@src/modules/notificacoes/services/preferencia.service';
import type { PontuacaoService } from '@src/modules/ranking/services/pontuacao.service';
import type { NotificacaoRepository } from '@src/modules/notificacoes/repositories/notificacao.repository.interface';
import type { JogoRepository } from '@src/modules/jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '@src/modules/jogos/repositories/fase.repository.interface';
import type { PalpiteRepository } from '@src/modules/palpites/repositories/palpite.repository.interface';
import type { PalpiteDobradoRepository } from '@src/modules/palpites/repositories/palpite-dobrado.repository.interface';
import type { GrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '@src/modules/grupos/repositories/grupo.repository.interface';
import type {
  JogoNotif,
  FaseNotif,
  GrupoNotif,
} from '@src/modules/notificacoes/types/notificacao.types';

function criarMocks() {
  return {
    notificacaoService: {
      criarLote: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificacaoService,
    pushService: {
      enviarParaUsuarios: vi.fn().mockResolvedValue(undefined),
    } as unknown as PushService,
    preferenciaService: {
      filtrarUsuariosHabilitados: vi
        .fn()
        .mockImplementation((ids: string[]) => Promise.resolve(ids)),
    } as unknown as PreferenciaService,
    pontuacaoService: {
      calcular: vi.fn().mockImplementation((palpite) => ({
        pontosBase: palpite ? 10 : 0,
      })),
    } as unknown as PontuacaoService,
    notificacaoRepo: {
      existeNotificacao: vi.fn().mockResolvedValue(false),
    } as unknown as NotificacaoRepository,
    jogoRepo: {
      buscarPorFase: vi.fn().mockResolvedValue([
        {
          id: 'jogo-antigo',
          status: 'FINALIZADO',
          golsCasa: 1,
          golsFora: 0,
        },
      ]),
    } as unknown as JogoRepository,
    faseRepo: {
      buscarPorTemporada: vi.fn().mockResolvedValue([
        {
          id: 'fase-1',
          nome: 'Fase 1',
          tipo: 'PONTOS_CORRIDOS',
          temporadaId: 'temp-1',
        },
      ]),
    } as unknown as FaseRepository,
    palpiteRepo: {
      listarPorJogosEUsuarios: vi.fn().mockResolvedValue([
        {
          usuarioId: 'user-1',
          jogoId: 'jogo-antigo',
          golsCasa: 1,
          golsFora: 0,
        },
        {
          usuarioId: 'user-2',
          jogoId: 'jogo-antigo',
          golsCasa: 0,
          golsFora: 0,
        },
      ]),
      listarPorJogoEUsuarios: vi.fn().mockResolvedValue([
        {
          usuarioId: 'user-2',
          jogoId: 'jogo-novo',
          golsCasa: 2,
          golsFora: 0,
        },
      ]),
    } as unknown as PalpiteRepository,
    palpiteDobradoRepo: {
      listarPorJogosEGrupo: vi.fn().mockResolvedValue([]),
    } as unknown as PalpiteDobradoRepository,
    grupoUsuarioRepo: {
      listarPorGrupoComUsuario: vi.fn().mockResolvedValue([
        { usuarioId: 'user-1', grupoId: 'grupo-1' },
        { usuarioId: 'user-2', grupoId: 'grupo-1' },
      ]),
    } as unknown as GrupoUsuarioRepository,
    grupoRepo: {
      buscarPorTemporadaId: vi.fn().mockResolvedValue([
        {
          id: 'grupo-1',
          nome: 'Amigos',
          temporadaId: 'temp-1',
          permitirPalpiteDobrado: false,
        },
      ]),
    } as unknown as GrupoRepository,
  };
}

describe('NotificacaoRankingService', () => {
  let service: NotificacaoRankingService;
  let mocks: ReturnType<typeof criarMocks>;

  const fase: FaseNotif = {
    id: 'fase-1',
    nome: 'Fase 1',
    tipo: 'PONTOS_CORRIDOS',
    temporadaId: 'temp-1',
  };

  const grupo: GrupoNotif = {
    id: 'grupo-1',
    nome: 'Amigos',
    temporadaId: 'temp-1',
    permitirPalpiteDobrado: false,
  };

  const jogoNovo: JogoNotif = {
    id: 'jogo-novo',
    faseId: 'fase-1',
    status: 'FINALIZADO',
    golsCasa: 2,
    golsFora: 0,
    timeCasaId: 't1',
    timeForaId: 't2',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = criarMocks();
    service = new NotificacaoRankingService(
      mocks.notificacaoService,
      mocks.pushService,
      mocks.preferenciaService,
      mocks.pontuacaoService,
      mocks.notificacaoRepo,
      mocks.jogoRepo,
      mocks.faseRepo,
      mocks.palpiteRepo,
      mocks.palpiteDobradoRepo,
      mocks.grupoUsuarioRepo,
      mocks.grupoRepo,
    );
  });

  it('deve notificar mudança de posição com dedupeId no push', async () => {
    await service.verificarMudancasPosicao(jogoNovo, fase);

    expect(mocks.notificacaoService.criarLote).toHaveBeenCalled();
    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        dedupeId: expect.stringContaining('jogo:jogo-novo:grupo:grupo-1:'),
      }),
    );
  });

  it('deve registrar erro quando processamento de um grupo falha', async () => {
    const loggerSpy = vi.spyOn(service['logger'], 'error');
    vi.mocked(mocks.grupoRepo.buscarPorTemporadaId).mockResolvedValue([
      grupo,
      { ...grupo, id: 'grupo-2', nome: 'Outro' },
    ]);
    vi.spyOn(service, 'processarMudancaPosicaoGrupo').mockImplementation(
      (_jogo, g) => {
        if (g.id === 'grupo-2') {
          return Promise.reject(new Error('falha no grupo'));
        }
        return Promise.resolve();
      },
    );

    await service.verificarMudancasPosicao(jogoNovo, fase);

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('grupo-2'));
  });

  it('deve calcular ranking sem o jogo excluído via Promise.all por fase', async () => {
    const ranking = await service.calcularRankingSemCache(grupo, 'jogo-novo');

    expect(mocks.jogoRepo.buscarPorFase).toHaveBeenCalledWith('fase-1');
    expect(ranking.length).toBeGreaterThan(0);
    expect(ranking[0]).toEqual(
      expect.objectContaining({ usuarioId: expect.any(String), posicao: 1 }),
    );
  });
});

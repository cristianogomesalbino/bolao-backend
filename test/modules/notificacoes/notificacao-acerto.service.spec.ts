import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificacaoAcertoService } from '@src/modules/notificacoes/services/notificacao-acerto.service';
import type { NotificacaoService } from '@src/modules/notificacoes/services/notificacao.service';
import type { PushService } from '@src/modules/notificacoes/services/push.service';
import type { PreferenciaService } from '@src/modules/notificacoes/services/preferencia.service';
import type { PontuacaoService } from '@src/modules/ranking/services/pontuacao.service';
import type { NotificacaoRepository } from '@src/modules/notificacoes/repositories/notificacao.repository.interface';
import type { PalpiteRepository } from '@src/modules/palpites/repositories/palpite.repository.interface';
import type { GrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '@src/modules/grupos/repositories/grupo.repository.interface';
import type {
  JogoNotif,
  FaseNotif,
} from '@src/modules/notificacoes/types/notificacao.types';

function criarMocks() {
  return {
    notificacaoService: {
      criarLote: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificacaoService,
    pushService: {
      enviarParaUsuario: vi.fn().mockResolvedValue(undefined),
    } as unknown as PushService,
    preferenciaService: {
      filtrarUsuariosHabilitados: vi
        .fn()
        .mockImplementation((ids: string[]) => Promise.resolve(ids)),
    } as unknown as PreferenciaService,
    pontuacaoService: {
      calcular: vi.fn().mockReturnValue({ pontosBase: 10 }),
    } as unknown as PontuacaoService,
    notificacaoRepo: {
      existeNotificacao: vi.fn().mockResolvedValue(false),
    } as unknown as NotificacaoRepository,
    palpiteRepo: {
      listarPorJogoEUsuarios: vi
        .fn()
        .mockResolvedValue([
          { usuarioId: 'user-1', golsCasa: 2, golsFora: 1, jogoId: 'jogo-1' },
        ]),
    } as unknown as PalpiteRepository,
    grupoUsuarioRepo: {
      listarPorGrupoComUsuario: vi
        .fn()
        .mockResolvedValue([{ usuarioId: 'user-1', grupoId: 'grupo-1' }]),
      listarPorUsuario: vi
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

describe('NotificacaoAcertoService', () => {
  let service: NotificacaoAcertoService;
  let mocks: ReturnType<typeof criarMocks>;

  const fase: FaseNotif = {
    id: 'fase-1',
    nome: 'Fase 1',
    tipo: 'PONTOS_CORRIDOS',
    temporadaId: 'temp-1',
  };

  const jogo: JogoNotif = {
    id: 'jogo-1',
    faseId: 'fase-1',
    status: 'FINALIZADO',
    golsCasa: 2,
    golsFora: 1,
    timeCasaId: 't1',
    timeForaId: 't2',
    timeCasa: { nome: 'Flamengo' },
    timeFora: { nome: 'Palmeiras' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = criarMocks();
    service = new NotificacaoAcertoService(
      mocks.notificacaoService,
      mocks.pushService,
      mocks.preferenciaService,
      mocks.pontuacaoService,
      mocks.notificacaoRepo,
      mocks.palpiteRepo,
      mocks.grupoUsuarioRepo,
      mocks.grupoRepo,
    );
  });

  it('deve notificar acerto em cheio e enviar push com dedupeId', async () => {
    await service.verificarAcertosEmCheio(jogo, fase);

    expect(
      mocks.grupoUsuarioRepo.listarPorGrupoComUsuario,
    ).toHaveBeenCalledWith('grupo-1');
    expect(mocks.notificacaoService.criarLote).toHaveBeenCalled();
    expect(mocks.pushService.enviarParaUsuario).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        tipo: 'ACERTO_EM_CHEIO',
        dedupeId: 'jogo:jogo-1:ACERTO_EM_CHEIO',
      }),
    );
  });

  it('deve sair cedo quando não há grupos', async () => {
    vi.mocked(mocks.grupoRepo.buscarPorTemporadaId).mockResolvedValue([]);

    await service.verificarAcertosEmCheio(jogo, fase);

    expect(mocks.palpiteRepo.listarPorJogoEUsuarios).not.toHaveBeenCalled();
  });
});

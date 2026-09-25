import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificacaoRodadaService } from '@src/modules/notificacoes/services/notificacao-rodada.service';
import { InMemoryNotificacaoRepository } from '@src/modules/notificacoes/repositories/in-memory-notificacao.repository';
import type { NotificacaoService } from '@src/modules/notificacoes/services/notificacao.service';
import type { PushService } from '@src/modules/notificacoes/services/push.service';
import type { PreferenciaService } from '@src/modules/notificacoes/services/preferencia.service';
import type { JogoRepository } from '@src/modules/jogos/repositories/jogo.repository.interface';
import type { GrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '@src/modules/grupos/repositories/grupo.repository.interface';
import type {
  JogoNotif,
  FaseNotif,
} from '@src/modules/notificacoes/types/notificacao.types';
import type { CriarNotificacaoData } from '@src/modules/notificacoes/repositories/notificacao.repository.interface';

function criarMocks(notificacaoRepo: InMemoryNotificacaoRepository) {
  const notificacaoService: NotificacaoService = {
    criarLote: vi.fn(async (dados: CriarNotificacaoData[]) => {
      await notificacaoRepo.criarVarios(dados);
    }),
  } as unknown as NotificacaoService;

  const pushService: PushService = {
    enviarParaUsuarios: vi.fn().mockResolvedValue(undefined),
  } as unknown as PushService;

  const preferenciaService: PreferenciaService = {
    filtrarUsuariosHabilitados: vi
      .fn()
      .mockImplementation((ids: string[]) => Promise.resolve(ids)),
  } as unknown as PreferenciaService;

  const jogoRepo: JogoRepository = {
    buscarPorFase: vi.fn().mockResolvedValue([
      { id: 'j1', status: 'FINALIZADO', rodada: 10 },
      { id: 'j2', status: 'FINALIZADO', rodada: 10 },
    ]),
  } as unknown as JogoRepository;

  const grupoUsuarioRepo: GrupoUsuarioRepository = {
    listarPorGrupoComUsuario: vi.fn().mockResolvedValue([
      { usuarioId: 'user-1', grupoId: 'grupo-1' },
      { usuarioId: 'user-2', grupoId: 'grupo-1' },
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
    jogoRepo,
    grupoUsuarioRepo,
    grupoRepo,
  };
}

describe('NotificacaoRodadaService', () => {
  let service: NotificacaoRodadaService;
  let notificacaoRepo: InMemoryNotificacaoRepository;
  let mocks: ReturnType<typeof criarMocks>;

  const fase: FaseNotif = {
    id: 'fase-1',
    nome: 'Fase Única',
    tipo: 'PONTOS_CORRIDOS',
    temporadaId: 'temp-1',
    temporada: { campeonato: { nome: 'Brasileirão' } },
  };

  const jogoA: JogoNotif = {
    id: 'j1',
    faseId: 'fase-1',
    rodada: 10,
    status: 'FINALIZADO',
    dataHora: new Date(),
    golsCasa: 1,
    golsFora: 0,
    timeCasaId: 't1',
    timeForaId: 't2',
  };

  const jogoB: JogoNotif = {
    ...jogoA,
    id: 'j2',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    notificacaoRepo = new InMemoryNotificacaoRepository();
    mocks = criarMocks(notificacaoRepo);
    service = new NotificacaoRodadaService(
      mocks.notificacaoService,
      mocks.pushService,
      mocks.preferenciaService,
      notificacaoRepo,
      mocks.jogoRepo,
      mocks.grupoUsuarioRepo,
      mocks.grupoRepo,
    );
  });

  it('deve notificar uma vez quando a rodada encerra', async () => {
    await service.verificarRodadaEncerrada(jogoA, fase);

    expect(mocks.notificacaoService.criarLote).toHaveBeenCalledTimes(1);
    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledTimes(1);
    expect(notificacaoRepo.items).toHaveLength(2);
    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledWith(
      ['user-1', 'user-2'],
      expect.objectContaining({
        tipo: 'RODADA_ENCERRADA',
        titulo: 'Rodada encerrada!',
        mensagem: 'Rodada 10 do Brasileirão encerrada! Confira o ranking.',
      }),
    );
  });

  it('não deve reenviar se já existe RODADA_ENCERRADA para a fase/rodada', async () => {
    await service.verificarRodadaEncerrada(jogoA, fase);
    await service.verificarRodadaEncerrada(jogoB, fase);

    expect(mocks.notificacaoService.criarLote).toHaveBeenCalledTimes(1);
    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledTimes(1);
  });

  it('deve enviar uma única vez sob chamadas concorrentes do mesmo lote', async () => {
    await Promise.all([
      service.verificarRodadaEncerrada(jogoA, fase),
      service.verificarRodadaEncerrada(jogoB, fase),
      service.verificarRodadaEncerrada(jogoA, fase),
    ]);

    expect(mocks.notificacaoService.criarLote).toHaveBeenCalledTimes(1);
    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledTimes(1);
  });

  it('permite notificar rodadas diferentes em paralelo', async () => {
    vi.mocked(mocks.jogoRepo.buscarPorFase).mockImplementation(
      async (_faseId: string, rodada?: number) => {
        if (rodada === 10) {
          return [
            { id: 'j1', status: 'FINALIZADO', rodada: 10 },
            { id: 'j2', status: 'FINALIZADO', rodada: 10 },
          ] as never;
        }
        return [
          { id: 'j3', status: 'FINALIZADO', rodada: 11 },
          { id: 'j4', status: 'FINALIZADO', rodada: 11 },
        ] as never;
      },
    );

    await Promise.all([
      service.verificarRodadaEncerrada(jogoA, fase),
      service.verificarRodadaEncerrada(
        { ...jogoA, id: 'j3', rodada: 11 },
        fase,
      ),
    ]);

    expect(mocks.notificacaoService.criarLote).toHaveBeenCalledTimes(2);
    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledTimes(2);
  });

  it('não deve notificar se a rodada ainda tem jogo aberto', async () => {
    vi.mocked(mocks.jogoRepo.buscarPorFase).mockResolvedValue([
      { id: 'j1', status: 'FINALIZADO', rodada: 10 },
      { id: 'j2', status: 'EM_ANDAMENTO', rodada: 10 },
    ] as never);

    await service.verificarRodadaEncerrada(jogoA, fase);

    expect(mocks.notificacaoService.criarLote).not.toHaveBeenCalled();
    expect(mocks.pushService.enviarParaUsuarios).not.toHaveBeenCalled();
  });

  it('não deve notificar se só há ADIADO/CANCELADO sem FINALIZADO', async () => {
    vi.mocked(mocks.jogoRepo.buscarPorFase).mockResolvedValue([
      { id: 'j1', status: 'ADIADO', rodada: 10 },
      { id: 'j2', status: 'CANCELADO', rodada: 10 },
    ] as never);

    await service.verificarRodadaEncerrada(jogoA, fase);

    expect(mocks.notificacaoService.criarLote).not.toHaveBeenCalled();
  });

  it('não deve notificar fase mata-mata', async () => {
    await service.verificarRodadaEncerrada(jogoA, {
      ...fase,
      tipo: 'MATA_MATA',
    });

    expect(mocks.notificacaoService.criarLote).not.toHaveBeenCalled();
  });

  it('não deve notificar jogo sem rodada', async () => {
    await service.verificarRodadaEncerrada({ ...jogoA, rodada: null }, fase);

    expect(mocks.jogoRepo.buscarPorFase).not.toHaveBeenCalled();
    expect(mocks.notificacaoService.criarLote).not.toHaveBeenCalled();
  });

  it('deve usar nome da fase quando campeonato não vem na temporada', async () => {
    await service.verificarRodadaEncerrada(jogoA, {
      ...fase,
      temporada: null,
    });

    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        mensagem: 'Rodada 10 do Fase Única encerrada! Confira o ranking.',
      }),
    );
  });

  it('deve respeitar preferências desabilitadas', async () => {
    vi.mocked(
      mocks.preferenciaService.filtrarUsuariosHabilitados,
    ).mockResolvedValue(['user-1']);

    await service.verificarRodadaEncerrada(jogoA, fase);

    expect(mocks.pushService.enviarParaUsuarios).toHaveBeenCalledWith(
      ['user-1'],
      expect.objectContaining({ tipo: 'RODADA_ENCERRADA' }),
    );
    expect(notificacaoRepo.items).toHaveLength(1);
    expect(notificacaoRepo.items[0].usuarioId).toBe('user-1');
  });

  it('considera ADIADO e CANCELADO como encerrados junto com FINALIZADO', async () => {
    vi.mocked(mocks.jogoRepo.buscarPorFase).mockResolvedValue([
      { id: 'j1', status: 'FINALIZADO', rodada: 10 },
      { id: 'j2', status: 'ADIADO', rodada: 10 },
      { id: 'j3', status: 'CANCELADO', rodada: 10 },
    ] as never);

    await service.verificarRodadaEncerrada(jogoA, fase);

    expect(mocks.notificacaoService.criarLote).toHaveBeenCalledTimes(1);
  });
});

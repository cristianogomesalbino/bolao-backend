import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryGeneratorService } from '../../../../src/modules/stories/services/story-generator.service';
import { StorySequenciaService } from '../../../../src/modules/stories/services/story-sequencia.service';
import { PontuacaoService } from '../../../../src/modules/ranking/services/pontuacao.service';
import { InMemoryStoryRepository } from '../../../../src/modules/stories/repositories/in-memory-story.repository';
import { InMemoryRankingSnapshotRepository } from '../../../../src/modules/stories/repositories/in-memory-ranking-snapshot.repository';
import type {
  JogoComTimes,
  GrupoBasico,
  MembroComUsuario,
  TipoStory,
} from '../../../../src/modules/stories/types/story.types';
import type { PalpiteRepository } from '../../../../src/modules/palpites/repositories/palpite.repository.interface';
import type { PalpiteDobradoRepository } from '../../../../src/modules/palpites/repositories/palpite-dobrado.repository.interface';

describe('StoryGeneratorService', () => {
  let service: StoryGeneratorService;
  let storyRepo: InMemoryStoryRepository;
  let snapshotRepo: InMemoryRankingSnapshotRepository;
  let sequenciaService: StorySequenciaService;
  let pontuacaoService: PontuacaoService;

  const mockPalpiteRepo = {
    listarPorJogoEUsuarios: vi.fn().mockResolvedValue([]),
  };

  const mockPalpiteDobradoRepo = {
    listarPorJogosEGrupo: vi.fn().mockResolvedValue([]),
  };

  const jogo: JogoComTimes = {
    id: 'jogo-1',
    faseId: 'fase-1',
    rodada: 5,
    status: 'FINALIZADO',
    golsCasa: 2,
    golsFora: 1,
    timeCasaId: 'time-casa',
    timeForaId: 'time-fora',
    dataHora: new Date(),
    timeCasa: {
      id: 'time-casa',
      nome: 'Palmeiras',
      sigla: 'PAL',
      escudo: null,
    },
    timeFora: {
      id: 'time-fora',
      nome: 'Corinthians',
      sigla: 'COR',
      escudo: null,
    },
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
    {
      usuarioId: 'user-3',
      grupoId: 'grupo-1',
      usuario: { id: 'user-3', nome: 'Lucas' },
    },
  ];

  beforeEach(() => {
    storyRepo = new InMemoryStoryRepository();
    snapshotRepo = new InMemoryRankingSnapshotRepository();
    pontuacaoService = new PontuacaoService();
    sequenciaService = {
      calcularSequenciaMosca: vi.fn().mockResolvedValue(null),
      calcularSequenciaResultado: vi.fn().mockResolvedValue(null),
      atualizarRecorde: vi
        .fn()
        .mockResolvedValue({ valor: 0, detentores: [], ehNovoRecorde: false }),
    } as unknown as StorySequenciaService;

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);
    mockPalpiteDobradoRepo.listarPorJogosEGrupo.mockResolvedValue([]);

    service = new StoryGeneratorService(
      storyRepo,
      snapshotRepo,
      mockPalpiteRepo as unknown as PalpiteRepository,
      mockPalpiteDobradoRepo as unknown as PalpiteDobradoRepository,
      pontuacaoService,
      sequenciaService,
    );
  });

  it('deve gerar NAO_PALPITOU para membros sem palpite', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);

    await service.gerarStoriesParaGrupo(jogo, grupo, membros);

    const stories = storyRepo.stories;
    const naoPalpitou = stories.filter((s) => s.tipo === 'NAO_PALPITOU');
    expect(naoPalpitou).toHaveLength(3);
  });

  it('deve gerar ACERTOU_EM_CHEIO quando 2+ cravaram', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
    ]);

    await service.gerarStoriesParaGrupo(jogo, grupo, membros);

    const acertou = storyRepo.stories.filter(
      (s) => s.tipo === 'ACERTOU_EM_CHEIO',
    );
    expect(acertou).toHaveLength(2);
  });

  it('deve gerar UNICO_NA_MOSCA quando apenas 1 cravou (não gera ACERTOU_EM_CHEIO)', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 1, golsFora: 0 },
    ]);

    await service.gerarStoriesParaGrupo(jogo, grupo, membros);

    const unico = storyRepo.stories.filter((s) => s.tipo === 'UNICO_NA_MOSCA');
    const acertou = storyRepo.stories.filter(
      (s) => s.tipo === 'ACERTOU_EM_CHEIO',
    );
    expect(unico).toHaveLength(1);
    expect(unico[0].usuarioId).toBe('user-1');
    expect(acertou).toHaveLength(0);
  });

  it('deve gerar SUBIU_RANKING quando subiu 2+ posições', async () => {
    // Snapshot anterior: user-1 estava na posição 4
    await snapshotRepo.upsertBatch([
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-1',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 4,
        pontuacao: 0,
      },
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-2',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 1,
        pontuacao: 0,
      },
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-3',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 2,
        pontuacao: 0,
      },
    ]);

    // user-1 acerta em cheio (3pts), user-2 e user-3 erram (0pts)
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
      { usuarioId: 'user-3', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
    ]);

    await service.gerarStoriesParaGrupo(jogo, grupo, membros);

    const subiu = storyRepo.stories.filter((s) => s.tipo === 'SUBIU_RANKING');
    expect(subiu).toHaveLength(1);
    expect(subiu[0].usuarioId).toBe('user-1');
  });

  it('NÃO deve gerar SUBIU_RANKING quando posições não mudam', async () => {
    await snapshotRepo.upsertBatch([
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-1',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 1,
        pontuacao: 0,
      },
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-2',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 2,
        pontuacao: 0,
      },
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-3',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 3,
        pontuacao: 0,
      },
    ]);

    // Todos erram — posições não mudam
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
      { usuarioId: 'user-3', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
    ]);

    await service.gerarStoriesParaGrupo(jogo, grupo, membros);

    const subiu = storyRepo.stories.filter((s) => s.tipo === 'SUBIU_RANKING');
    expect(subiu).toHaveLength(0);
  });

  it('deve gerar DOBROU_E_ACERTOU quando membro usou dobro e acertou', async () => {
    const grupoComDobro: GrupoBasico = {
      ...grupo,
      permitirPalpiteDobrado: true,
    };

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
    ]);
    mockPalpiteDobradoRepo.listarPorJogosEGrupo.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1' },
    ]);

    await service.gerarStoriesParaGrupo(jogo, grupoComDobro, membros);

    const dobrou = storyRepo.stories.filter(
      (s) => s.tipo === 'DOBROU_E_ACERTOU',
    );
    expect(dobrou).toHaveLength(1);
    expect(dobrou[0].usuarioId).toBe('user-1');
  });

  it('deve gerar múltiplos stories para o mesmo membro se atender múltiplos critérios', async () => {
    const grupoComDobro: GrupoBasico = {
      ...grupo,
      permitirPalpiteDobrado: true,
    };

    await snapshotRepo.upsertBatch([
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-1',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 5,
        pontuacao: 0,
      },
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-2',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 1,
        pontuacao: 0,
      },
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-3',
        faseId: 'fase-1',
        rodada: 4,
        posicao: 2,
        pontuacao: 0,
      },
    ]);

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
      { usuarioId: 'user-3', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
    ]);
    mockPalpiteDobradoRepo.listarPorJogosEGrupo.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1' },
    ]);

    await service.gerarStoriesParaGrupo(jogo, grupoComDobro, membros);

    const storiesUser1 = storyRepo.stories.filter(
      (s) => s.usuarioId === 'user-1',
    );
    // UNICO_NA_MOSCA + SUBIU_RANKING + DOBROU_E_ACERTOU = 3 stories
    expect(storiesUser1.length).toBeGreaterThanOrEqual(3);
  });

  it('não deve gerar stories duplicados (deduplicação)', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);

    await service.gerarStoriesParaGrupo(jogo, grupo, membros);
    const primeiraExecucao = storyRepo.stories.length;

    // Segunda execução — não deve duplicar
    await service.gerarStoriesParaGrupo(jogo, grupo, membros);
    expect(storyRepo.stories).toHaveLength(primeiraExecucao);
  });

  it('deve continuar gerando se falhar para um membro individual', async () => {
    // Salva referência antes de espiar
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const originalMethod: typeof storyRepo.existeStory =
      storyRepo.existeStory.bind(storyRepo);
    let callCount = 0;
    vi.spyOn(storyRepo, 'existeStory').mockImplementation(
      async (
        grupoId: string,
        usuarioId: string,
        jogoId: string,
        tipo: TipoStory,
      ): Promise<boolean> => {
        callCount++;
        if (callCount === 2) throw new Error('Erro simulado');
        return await originalMethod(grupoId, usuarioId, jogoId, tipo);
      },
    );

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);

    await service.gerarStoriesParaGrupo(jogo, grupo, membros);

    // Deve ter gerado stories pra pelo menos 2 membros (1 falhou)
    expect(storyRepo.stories.length).toBeGreaterThanOrEqual(2);
  });

  it('deve persistir título randomizado no story', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);

    await service.gerarStoriesParaGrupo(jogo, grupo, membros);

    const story = storyRepo.stories[0];
    expect(story.titulo).toBeDefined();
    expect(story.titulo.length).toBeGreaterThan(0);
  });
});

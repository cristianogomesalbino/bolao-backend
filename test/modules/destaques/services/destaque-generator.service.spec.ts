import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueGeneratorService } from '../../../../src/modules/destaques/services/destaque-generator.service';
import { DestaqueSequenciaService } from '../../../../src/modules/destaques/services/destaque-sequencia.service';
import { PontuacaoService } from '../../../../src/modules/ranking/services/pontuacao.service';
import type { RankingService } from '../../../../src/modules/ranking/services/ranking.service';
import { InMemoryDestaqueRepository } from '../../../../src/modules/destaques/repositories/in-memory-destaque.repository';
import { InMemoryRankingSnapshotRepository } from '../../../../src/modules/destaques/repositories/in-memory-ranking-snapshot.repository';
import type {
  JogoComTimes,
  GrupoBasico,
  MembroComUsuario,
  TipoDestaque,
} from '../../../../src/modules/destaques/types/destaque.types';
import type { PalpiteRepository } from '../../../../src/modules/palpites/repositories/palpite.repository.interface';
import type { PalpiteDobradoRepository } from '../../../../src/modules/palpites/repositories/palpite-dobrado.repository.interface';

describe('DestaqueGeneratorService', () => {
  let service: DestaqueGeneratorService;
  let destaqueRepo: InMemoryDestaqueRepository;
  let snapshotRepo: InMemoryRankingSnapshotRepository;
  let sequenciaService: DestaqueSequenciaService;
  let pontuacaoService: PontuacaoService;

  const mockPalpiteRepo = {
    listarPorJogoEUsuarios: vi.fn().mockResolvedValue([]),
  };

  const mockPalpiteDobradoRepo = {
    listarPorJogosEGrupo: vi.fn().mockResolvedValue([]),
  };

  const rankingRodada4 = [
    { usuarioId: 'user-1', nomeUsuario: 'João', posicao: 4, pontuacaoTotal: 10 },
    { usuarioId: 'user-2', nomeUsuario: 'Pedro', posicao: 1, pontuacaoTotal: 30 },
    { usuarioId: 'user-3', nomeUsuario: 'Lucas', posicao: 2, pontuacaoTotal: 20 },
  ];
  const rankingRodada5 = [
    { usuarioId: 'user-1', nomeUsuario: 'João', posicao: 1, pontuacaoTotal: 25 },
    { usuarioId: 'user-2', nomeUsuario: 'Pedro', posicao: 2, pontuacaoTotal: 30 },
    { usuarioId: 'user-3', nomeUsuario: 'Lucas', posicao: 3, pontuacaoTotal: 20 },
  ];

  const mockRankingService = {
    rodadaEncerrada: vi.fn().mockResolvedValue(false),
    calcularRankingAteRodada: vi.fn().mockResolvedValue([]),
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
    destaqueRepo = new InMemoryDestaqueRepository();
    snapshotRepo = new InMemoryRankingSnapshotRepository();
    pontuacaoService = new PontuacaoService();
    sequenciaService = {
      calcularSequenciaResultado: vi.fn().mockResolvedValue(null),
      listarCravadasDaRodada: vi.fn().mockResolvedValue([]),
      listarEsquecidosDaRodada: vi.fn().mockResolvedValue([]),
      atualizarRecorde: vi
        .fn()
        .mockResolvedValue({ valor: 0, detentores: [], ehNovoRecorde: false }),
    } as unknown as DestaqueSequenciaService;

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);
    mockPalpiteDobradoRepo.listarPorJogosEGrupo.mockResolvedValue([]);
    mockRankingService.rodadaEncerrada.mockResolvedValue(false);
    mockRankingService.calcularRankingAteRodada.mockResolvedValue([]);

    service = new DestaqueGeneratorService(
      destaqueRepo,
      snapshotRepo,
      mockPalpiteRepo as unknown as PalpiteRepository,
      mockPalpiteDobradoRepo as unknown as PalpiteDobradoRepository,
      pontuacaoService,
      sequenciaService,
      mockRankingService as unknown as RankingService,
    );
  });

  it('deve gerar NAO_PALPITOU para membros sem palpite', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    const destaquesCriados = destaqueRepo.destaques;
    const naoPalpitou = destaquesCriados.filter(
      (s) => s.tipo === 'NAO_PALPITOU',
    );
    expect(naoPalpitou).toHaveLength(3);
  });

  it('reúne os palpites esquecidos da rodada em um card por pessoa', async () => {
    const listar = sequenciaService.listarEsquecidosDaRodada as unknown as ReturnType<typeof vi.fn>;
    listar.mockResolvedValue([
      {
        jogoId: 'jogo-1',
        timeCasa: jogo.timeCasa,
        timeFora: jogo.timeFora,
        golsCasa: 2,
        golsFora: 1,
      },
      {
        jogoId: 'jogo-2',
        timeCasa: { nome: 'Santos', sigla: 'SAN', escudo: null },
        timeFora: { nome: 'Flamengo', sigla: 'FLA', escudo: null },
        golsCasa: 0,
        golsFora: 0,
      },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, [membros[0]]);

    const esquecidos = destaqueRepo.destaques.filter((s) => s.tipo === 'NAO_PALPITOU');
    expect(esquecidos).toHaveLength(1);
    expect((esquecidos[0].dados as { jogosEsquecidos: unknown[] }).jogosEsquecidos).toHaveLength(2);
  });

  it('deve gerar ACERTOU_EM_CHEIO quando 2+ cravaram', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    const acertou = destaqueRepo.destaques.filter(
      (s) => s.tipo === 'ACERTOU_EM_CHEIO',
    );
    expect(acertou).toHaveLength(2);
  });

  it('deve gerar UNICO_NA_MOSCA quando apenas 1 cravou (não gera ACERTOU_EM_CHEIO)', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 1, golsFora: 0 },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    const unico = destaqueRepo.destaques.filter(
      (s) => s.tipo === 'UNICO_NA_MOSCA',
    );
    const acertou = destaqueRepo.destaques.filter(
      (s) => s.tipo === 'ACERTOU_EM_CHEIO',
    );
    expect(unico).toHaveLength(1);
    expect(unico[0].usuarioId).toBe('user-1');
    expect(acertou).toHaveLength(0);
  });

  it('deve gerar SUBIU_RANKING quando subiu 2+ posições na rodada', async () => {
    mockRankingService.rodadaEncerrada.mockResolvedValue(true);
    mockRankingService.calcularRankingAteRodada.mockImplementation(
      async (_grupoId: string, _faseId: string, ateRodada: number) =>
        ateRodada >= 5 ? rankingRodada5 : rankingRodada4,
    );

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
      { usuarioId: 'user-3', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    const subiu = destaqueRepo.destaques.filter(
      (s) => s.tipo === 'SUBIU_RANKING',
    );
    expect(subiu).toHaveLength(1);
    expect(subiu[0].usuarioId).toBe('user-1');
  });

  it('NÃO deve gerar SUBIU_RANKING quando a posição da rodada não muda', async () => {
    mockRankingService.rodadaEncerrada.mockResolvedValue(true);
    mockRankingService.calcularRankingAteRodada.mockResolvedValue(rankingRodada4);

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
      { usuarioId: 'user-3', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    const subiu = destaqueRepo.destaques.filter(
      (s) => s.tipo === 'SUBIU_RANKING',
    );
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

    await service.gerarDestaquesParaGrupo(jogo, grupoComDobro, membros);

    const dobrou = destaqueRepo.destaques.filter(
      (s) => s.tipo === 'DOBROU_E_ACERTOU',
    );
    expect(dobrou).toHaveLength(1);
    expect(dobrou[0].usuarioId).toBe('user-1');
  });

  it('deve gerar múltiplos destaques para o mesmo membro se atender múltiplos critérios', async () => {
    const grupoComDobro: GrupoBasico = {
      ...grupo,
      permitirPalpiteDobrado: true,
    };

    mockRankingService.rodadaEncerrada.mockResolvedValue(true);
    mockRankingService.calcularRankingAteRodada.mockImplementation(
      async (_grupoId: string, _faseId: string, ateRodada: number) =>
        ateRodada >= 5
          ? rankingRodada5
          : rankingRodada4.map((r) =>
              r.usuarioId === 'user-1' ? { ...r, posicao: 5 } : r,
            ),
    );

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
      { usuarioId: 'user-3', jogoId: 'jogo-1', golsCasa: 0, golsFora: 3 },
    ]);
    mockPalpiteDobradoRepo.listarPorJogosEGrupo.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1' },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupoComDobro, membros);

    const destaquesUser1 = destaqueRepo.destaques.filter(
      (s) => s.usuarioId === 'user-1',
    );
    // UNICO_NA_MOSCA + SUBIU_RANKING + DOBROU_E_ACERTOU = 3 destaques
    expect(destaquesUser1.length).toBeGreaterThanOrEqual(3);
  });

  it('não deve gerar destaques duplicados (deduplicação)', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);
    const primeiraExecucao = destaqueRepo.destaques.length;

    // Segunda execução — não deve duplicar
    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);
    expect(destaqueRepo.destaques).toHaveLength(primeiraExecucao);
  });

  it('deve continuar gerando se falhar para um membro individual', async () => {
    // Salva referência antes de espiar
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const originalMethod: typeof destaqueRepo.existeDestaque =
      destaqueRepo.existeDestaque.bind(destaqueRepo);
    let callCount = 0;
    vi.spyOn(destaqueRepo, 'existeDestaque').mockImplementation(
      async (
        grupoId: string,
        usuarioId: string,
        jogoId: string,
        tipo: TipoDestaque,
      ): Promise<boolean> => {
        callCount++;
        if (callCount === 2) throw new Error('Erro simulado');
        return await originalMethod(grupoId, usuarioId, jogoId, tipo);
      },
    );

    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    // Deve ter gerado destaques pra pelo menos 2 membros (1 falhou)
    expect(destaqueRepo.destaques.length).toBeGreaterThanOrEqual(2);
  });

  it('deve persistir título randomizado no destaque', async () => {
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    const destaque = destaqueRepo.destaques[0];
    expect(destaque.titulo).toBeDefined();
    expect(destaque.titulo.length).toBeGreaterThan(0);
  });

  it('atualiza o card de acerto da rodada em vez de criar outro', async () => {
    const listar = sequenciaService.listarCravadasDaRodada as unknown as ReturnType<typeof vi.fn>;
    const placar = (
      id: string,
      golsCasa: number,
      golsFora: number,
      casa: { nome: string; sigla: string },
      fora: { nome: string; sigla: string },
    ) => ({
      jogoId: id,
      golsCasa,
      golsFora,
      timeCasa: { ...casa, escudo: null },
      timeFora: { ...fora, escudo: null },
    });

    listar.mockResolvedValue([
      placar('jogo-1', 2, 1, { nome: 'Palmeiras', sigla: 'PAL' }, { nome: 'Corinthians', sigla: 'COR' }),
    ]);
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
    ]);
    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    const jogo2: JogoComTimes = {
      ...jogo,
      id: 'jogo-2',
      golsCasa: 1,
      golsFora: 1,
      timeCasa: { id: 'san', nome: 'Santos', sigla: 'SAN', escudo: null },
      timeFora: { id: 'fla', nome: 'Flamengo', sigla: 'FLA', escudo: null },
    };
    listar.mockImplementation(async (usuarioId: string) =>
      usuarioId === 'user-1'
        ? [
            placar('jogo-1', 2, 1, { nome: 'Palmeiras', sigla: 'PAL' }, { nome: 'Corinthians', sigla: 'COR' }),
            placar('jogo-2', 1, 1, { nome: 'Santos', sigla: 'SAN' }, { nome: 'Flamengo', sigla: 'FLA' }),
          ]
        : [],
    );
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-2', golsCasa: 1, golsFora: 1 },
    ]);
    await service.gerarDestaquesParaGrupo(jogo2, grupo, membros);

    const acertos = destaqueRepo.destaques.filter(
      (s) => s.tipo === 'ACERTOU_EM_CHEIO' && s.usuarioId === 'user-1',
    );
    expect(acertos).toHaveLength(1);
    expect((acertos[0].dados as { jogos?: unknown[] }).jogos).toHaveLength(2);
    expect(
      destaqueRepo.destaques.filter(
        (s) => s.tipo === 'SEQUENCIA_RESULTADO',
      ),
    ).toHaveLength(0);
  });

  it('substitui o único na mosca pela lista quando crava outro jogo', async () => {
    const listar = sequenciaService.listarCravadasDaRodada as unknown as ReturnType<typeof vi.fn>;
    listar.mockResolvedValue([
      {
        jogoId: 'jogo-1',
        golsCasa: 2,
        golsFora: 1,
        timeCasa: jogo.timeCasa,
        timeFora: jogo.timeFora,
      },
    ]);
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
    ]);
    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);
    expect(destaqueRepo.destaques.filter((s) => s.tipo === 'UNICO_NA_MOSCA')).toHaveLength(1);

    const jogo2: JogoComTimes = {
      ...jogo,
      id: 'jogo-2',
      golsCasa: 0,
      golsFora: 0,
    };
    listar.mockImplementation(async (usuarioId: string) =>
      usuarioId === 'user-1'
        ? [
            {
              jogoId: 'jogo-1',
              golsCasa: 2,
              golsFora: 1,
              timeCasa: jogo.timeCasa,
              timeFora: jogo.timeFora,
            },
            {
              jogoId: 'jogo-2',
              golsCasa: 0,
              golsFora: 0,
              timeCasa: jogo.timeCasa,
              timeFora: jogo.timeFora,
            },
          ]
        : [],
    );
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-2', golsCasa: 0, golsFora: 0 },
      { usuarioId: 'user-2', jogoId: 'jogo-2', golsCasa: 0, golsFora: 0 },
    ]);
    await service.gerarDestaquesParaGrupo(jogo2, grupo, membros);

    expect(destaqueRepo.destaques.filter((s) => s.tipo === 'UNICO_NA_MOSCA')).toHaveLength(0);
    const acertos = destaqueRepo.destaques.filter(
      (s) => s.tipo === 'ACERTOU_EM_CHEIO' && s.usuarioId === 'user-1',
    );
    expect(acertos).toHaveLength(1);
    expect((acertos[0].dados as { jogos?: unknown[] }).jogos).toHaveLength(2);
  });

  it('gera sequência de pontuação quando não cravou placar na rodada', async () => {
    (sequenciaService.calcularSequenciaResultado as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      quantidade: 4,
      pontos: 7,
      ultimosJogos: [],
      rodadaInicio: 4,
    });
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 1, golsFora: 0 },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    const sequencias = destaqueRepo.destaques.filter((s) => s.tipo === 'SEQUENCIA_RESULTADO');
    expect(sequencias).toHaveLength(1);
    expect(sequencias[0].usuarioId).toBe('user-1');
    expect(sequencias[0].dados).toMatchObject({ quantidadeAcertos: 4, pontos: 7 });
    expect(destaqueRepo.destaques.filter((s) => s.tipo === 'ACERTOU_EM_CHEIO')).toHaveLength(0);
  });

  it('gera sequência de pontuação de 4 pontos junto do placar cravado', async () => {
    (sequenciaService.calcularSequenciaResultado as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      quantidade: 3,
      pontos: 5,
      ultimosJogos: [],
      rodadaInicio: 5,
    });
    (sequenciaService.listarCravadasDaRodada as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        jogoId: 'jogo-1',
        golsCasa: 2,
        golsFora: 1,
        timeCasa: jogo.timeCasa,
        timeFora: jogo.timeFora,
      },
    ]);
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { usuarioId: 'user-2', jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    expect(destaqueRepo.destaques.filter((s) => s.tipo === 'SEQUENCIA_RESULTADO')).toHaveLength(2);
    expect(destaqueRepo.destaques.filter((s) => s.tipo === 'ACERTOU_EM_CHEIO')).toHaveLength(2);
  });

  it('não gera sequência de pontuação abaixo de 4 pontos', async () => {
    (sequenciaService.calcularSequenciaResultado as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      quantidade: 3,
      pontos: 3,
      ultimosJogos: [],
      rodadaInicio: 5,
    });
    mockPalpiteRepo.listarPorJogoEUsuarios.mockResolvedValue([
      { usuarioId: 'user-1', jogoId: 'jogo-1', golsCasa: 1, golsFora: 0 },
    ]);

    await service.gerarDestaquesParaGrupo(jogo, grupo, membros);

    expect(destaqueRepo.destaques.filter((s) => s.tipo === 'SEQUENCIA_RESULTADO')).toHaveLength(0);
  });
});

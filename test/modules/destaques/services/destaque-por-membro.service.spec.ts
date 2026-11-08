import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaquePorMembroService } from '../../../../src/modules/destaques/services/destaque-por-membro.service';
import { InMemoryDestaqueRepository } from '../../../../src/modules/destaques/repositories/in-memory-destaque.repository';
import type { DestaqueSequenciaService } from '../../../../src/modules/destaques/services/destaque-sequencia.service';
import type { DestaqueAcertoService } from '../../../../src/modules/destaques/services/destaque-acerto.service';
import type { GeracaoContexto } from '../../../../src/modules/destaques/services/destaque-geracao.contexto';
import type { MembroComUsuario } from '../../../../src/modules/destaques/types/destaque.types';
import type { CriarDestaqueData } from '../../../../src/modules/destaques/repositories/destaque.repository.interface';

describe('DestaquePorMembroService', () => {
  let service: DestaquePorMembroService;
  let destaqueRepo: InMemoryDestaqueRepository;
  let sequenciaService: {
    calcularMelhorSequenciaResultado: ReturnType<typeof vi.fn>;
    atualizarRecorde: ReturnType<typeof vi.fn>;
  };
  let destaqueAcerto: {
    gerarNaoPalpitou: ReturnType<typeof vi.fn>;
    sincronizarNaoPalpitouExistente: ReturnType<typeof vi.fn>;
    gerarAcerto: ReturnType<typeof vi.fn>;
  };

  const membro: MembroComUsuario = {
    usuarioId: 'user-1',
    grupoId: 'grupo-1',
    usuario: { id: 'user-1', nome: 'Ana' },
  };

  const criarCtx = (
    overrides: Partial<GeracaoContexto> = {},
  ): GeracaoContexto => ({
    jogo: {
      id: 'jogo-1',
      faseId: 'fase-1',
      rodada: 5,
      status: 'FINALIZADO',
      golsCasa: 1,
      golsFora: 0,
      timeCasaId: 'tc',
      timeForaId: 'tf',
      dataHora: '2026-11-01T12:00:00Z',
      timeCasa: {
        id: 'tc',
        nome: 'Flamengo',
        sigla: 'FLA',
        escudo: null,
      },
      timeFora: {
        id: 'tf',
        nome: 'Palmeiras',
        sigla: 'PAL',
        escudo: null,
      },
    },
    grupo: {
      id: 'grupo-1',
      nome: 'Bolão',
      temporadaId: 'temp-1',
      permitirPalpiteDobrado: true,
    },
    palpiteMap: new Map([['user-1', { golsCasa: 1, golsFora: 0 }]]),
    dobradoSet: new Set(),
    membrosNaMosca: [],
    unicoNaMosca: false,
    posicaoAnteriorMap: new Map([['user-1', 8]]),
    rankingAtual: new Map([['user-1', 5]]),
    rankingDepois: [],
    top5: [{ posicao: 1, nome: 'X', pontuacao: 10 }],
    resultados: [
      {
        usuarioId: 'user-1',
        nomeUsuario: 'Ana',
        categoriaAcerto: 'ACERTO_EM_CHEIO',
        pontosBase: 3,
      },
    ],
    ultimoTituloPorTipo: new Map(),
    titulosUsadosPorTipo: new Map(),
    ...overrides,
  });

  beforeEach(() => {
    destaqueRepo = new InMemoryDestaqueRepository();
    sequenciaService = {
      calcularMelhorSequenciaResultado: vi.fn().mockResolvedValue(null),
      atualizarRecorde: vi.fn().mockResolvedValue({
        valor: 3,
        detentores: [],
        ehNovoRecorde: false,
      }),
    };
    destaqueAcerto = {
      gerarNaoPalpitou: vi.fn().mockResolvedValue([]),
      sincronizarNaoPalpitouExistente: vi.fn().mockResolvedValue(undefined),
      gerarAcerto: vi.fn().mockResolvedValue(undefined),
    };
    service = new DestaquePorMembroService(
      destaqueRepo,
      sequenciaService as unknown as DestaqueSequenciaService,
      destaqueAcerto as unknown as DestaqueAcertoService,
    );
  });

  it('sem palpite gera NAO_PALPITOU e avalia ranking', async () => {
    const naoPalpitou: CriarDestaqueData[] = [
      {
        grupoId: 'grupo-1',
        usuarioId: 'user-1',
        jogoId: 'jogo-1',
        rodada: 5,
        tipo: 'NAO_PALPITOU',
        titulo: 'Sumiu',
        dados: {},
      },
    ];
    destaqueAcerto.gerarNaoPalpitou.mockResolvedValue(naoPalpitou);

    const resultado = await service.gerarParaMembro(
      membro,
      criarCtx({ palpiteMap: new Map() }),
    );

    expect(destaqueAcerto.gerarNaoPalpitou).toHaveBeenCalled();
    expect(resultado.some((d) => d.tipo === 'NAO_PALPITOU')).toBe(true);
    expect(resultado.some((d) => d.tipo === 'SUBIU_RANKING')).toBe(true);
  });

  it('com palpite gera acerto, ranking, dobro e sequência', async () => {
    sequenciaService.calcularMelhorSequenciaResultado.mockResolvedValue({
      quantidade: 3,
      pontos: 5,
      rodadaInicio: 5,
      rodadaFim: 5,
      ultimosJogos: [],
    });

    const resultado = await service.gerarParaMembro(
      membro,
      criarCtx({ dobradoSet: new Set(['user-1']) }),
    );

    expect(destaqueAcerto.sincronizarNaoPalpitouExistente).toHaveBeenCalled();
    expect(destaqueAcerto.gerarAcerto).toHaveBeenCalled();
    expect(resultado.map((d) => d.tipo).sort()).toEqual([
      'DOBROU_E_ACERTOU',
      'SEQUENCIA_RESULTADO',
      'SUBIU_RANKING',
    ]);
    expect(sequenciaService.atualizarRecorde).toHaveBeenCalledWith(
      'grupo-1',
      'temp-1',
      'RESULTADO',
      'user-1',
      3,
    );
  });

  it('não cria SUBIU_RANKING se já existe na rodada', async () => {
    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-1',
      jogoId: 'jogo-0',
      rodada: 5,
      tipo: 'SUBIU_RANKING',
      titulo: 'Subiu',
      dados: {},
    });

    const resultado = await service.gerarParaMembro(membro, criarCtx());

    expect(resultado.some((d) => d.tipo === 'SUBIU_RANKING')).toBe(false);
  });

  it('remove SEQUENCIA_RESULTADO quando não atinge mínimo', async () => {
    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-1',
      jogoId: 'jogo-0',
      rodada: 5,
      tipo: 'SEQUENCIA_RESULTADO',
      titulo: 'Seq',
      dados: {},
    });
    sequenciaService.calcularMelhorSequenciaResultado.mockResolvedValue({
      quantidade: 2,
      pontos: 2,
      rodadaInicio: 5,
      rodadaFim: 5,
      ultimosJogos: [],
    });

    await service.gerarParaMembro(membro, criarCtx());

    expect(
      await destaqueRepo.buscarNaRodada(
        'grupo-1',
        'user-1',
        5,
        'SEQUENCIA_RESULTADO',
      ),
    ).toBeNull();
  });

  it('retorna vazio se palpite existe mas resultado não', async () => {
    const resultado = await service.gerarParaMembro(
      membro,
      criarCtx({ resultados: [] }),
    );
    expect(resultado).toEqual([]);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueAcertoService } from '../../../../src/modules/destaques/services/destaque-acerto.service';
import { InMemoryDestaqueRepository } from '../../../../src/modules/destaques/repositories/in-memory-destaque.repository';
import type { DestaqueSequenciaService } from '../../../../src/modules/destaques/services/destaque-sequencia.service';
import type { GeracaoContexto } from '../../../../src/modules/destaques/services/destaque-geracao.contexto';
import type { MembroComUsuario } from '../../../../src/modules/destaques/types/destaque.types';
import type { CriarDestaqueData } from '../../../../src/modules/destaques/repositories/destaque.repository.interface';

describe('DestaqueAcertoService', () => {
  let service: DestaqueAcertoService;
  let destaqueRepo: InMemoryDestaqueRepository;
  let sequenciaService: {
    listarEsquecidosDaRodada: ReturnType<typeof vi.fn>;
    listarCravadasDaRodada: ReturnType<typeof vi.fn>;
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
    palpiteMap: new Map(),
    dobradoSet: new Set(),
    membrosNaMosca: [],
    unicoNaMosca: false,
    posicaoAnteriorMap: new Map(),
    rankingAtual: new Map(),
    rankingDepois: [],
    top5: [],
    resultados: [],
    ultimoTituloPorTipo: new Map(),
    titulosUsadosPorTipo: new Map(),
    ...overrides,
  });

  beforeEach(() => {
    destaqueRepo = new InMemoryDestaqueRepository();
    sequenciaService = {
      listarEsquecidosDaRodada: vi.fn().mockResolvedValue([]),
      listarCravadasDaRodada: vi.fn().mockResolvedValue([]),
    };
    service = new DestaqueAcertoService(
      destaqueRepo,
      sequenciaService as unknown as DestaqueSequenciaService,
    );
  });

  describe('gerarNaoPalpitou', () => {
    it('cria destaque quando não existe na rodada', async () => {
      sequenciaService.listarEsquecidosDaRodada.mockResolvedValue([
        {
          jogoId: 'jogo-0',
          timeCasa: { nome: 'A', sigla: 'A', escudo: null },
          timeFora: { nome: 'B', sigla: 'B', escudo: null },
          golsCasa: 0,
          golsFora: 0,
        },
      ]);

      const criados = await service.gerarNaoPalpitou(membro, criarCtx());

      expect(criados).toHaveLength(1);
      expect(criados[0].tipo).toBe('NAO_PALPITOU');
      expect(
        (criados[0].dados as { totalJogosRodada: number }).totalJogosRodada,
      ).toBe(2);
    });

    it('atualiza existente e não retorna novo', async () => {
      const existente = await destaqueRepo.criar({
        grupoId: 'grupo-1',
        usuarioId: 'user-1',
        jogoId: 'jogo-antigo',
        rodada: 5,
        tipo: 'NAO_PALPITOU',
        titulo: 'Sumiu',
        dados: { jogosEsquecidos: [] },
      });
      sequenciaService.listarEsquecidosDaRodada.mockResolvedValue([
        {
          jogoId: 'jogo-1',
          timeCasa: { nome: 'Flamengo', sigla: 'FLA', escudo: null },
          timeFora: { nome: 'Palmeiras', sigla: 'PAL', escudo: null },
          golsCasa: 1,
          golsFora: 0,
        },
      ]);

      const criados = await service.gerarNaoPalpitou(membro, criarCtx());

      expect(criados).toEqual([]);
      const atualizado = await destaqueRepo.buscarPorId(existente.id);
      expect(
        (atualizado?.dados as { totalJogosRodada: number }).totalJogosRodada,
      ).toBe(1);
    });
  });

  describe('sincronizarNaoPalpitouExistente', () => {
    it('remove destaque quando não há mais esquecidos', async () => {
      await destaqueRepo.criar({
        grupoId: 'grupo-1',
        usuarioId: 'user-1',
        jogoId: 'jogo-1',
        rodada: 5,
        tipo: 'NAO_PALPITOU',
        titulo: 'Sumiu',
        dados: { jogosEsquecidos: [] },
      });
      sequenciaService.listarEsquecidosDaRodada.mockResolvedValue([]);

      await service.sincronizarNaoPalpitouExistente(membro, criarCtx());

      expect(
        await destaqueRepo.buscarNaRodada(
          'grupo-1',
          'user-1',
          5,
          'NAO_PALPITOU',
        ),
      ).toBeNull();
    });

    it('não faz nada se rodada é null', async () => {
      await service.sincronizarNaoPalpitouExistente(
        membro,
        criarCtx({
          jogo: { ...criarCtx().jogo, rodada: null },
        }),
      );
      expect(sequenciaService.listarEsquecidosDaRodada).not.toHaveBeenCalled();
    });
  });

  describe('gerarAcerto', () => {
    it('gera UNICO_NA_MOSCA quando é o único', async () => {
      const destaques: CriarDestaqueData[] = [];
      const ctx = criarCtx({
        unicoNaMosca: true,
        membrosNaMosca: [
          {
            usuarioId: 'user-1',
            nomeUsuario: 'Ana',
            categoriaAcerto: 'ACERTO_EM_CHEIO',
            pontosBase: 3,
          },
        ],
      });

      await service.gerarAcerto(
        membro,
        {
          usuarioId: 'user-1',
          nomeUsuario: 'Ana',
          categoriaAcerto: 'ACERTO_EM_CHEIO',
          pontosBase: 3,
        },
        ctx,
        destaques,
      );

      expect(destaques).toHaveLength(1);
      expect(destaques[0].tipo).toBe('UNICO_NA_MOSCA');
    });

    it('cria ACERTOU_EM_CHEIO com lista de cravadas', async () => {
      sequenciaService.listarCravadasDaRodada.mockResolvedValue([
        {
          jogoId: 'jogo-0',
          golsCasa: 2,
          golsFora: 1,
          timeCasa: { nome: 'A', sigla: 'A', escudo: null },
          timeFora: { nome: 'B', sigla: 'B', escudo: null },
        },
      ]);
      const destaques: CriarDestaqueData[] = [];

      await service.gerarAcerto(
        membro,
        {
          usuarioId: 'user-1',
          nomeUsuario: 'Ana',
          categoriaAcerto: 'ACERTO_EM_CHEIO',
          pontosBase: 3,
        },
        criarCtx(),
        destaques,
      );

      expect(destaques).toHaveLength(1);
      expect(destaques[0].tipo).toBe('ACERTOU_EM_CHEIO');
      expect((destaques[0].dados as { jogos?: unknown[] }).jogos).toHaveLength(
        2,
      );
    });

    it('ignora quando categoria não é cheio', async () => {
      const destaques: CriarDestaqueData[] = [];
      await service.gerarAcerto(
        membro,
        {
          usuarioId: 'user-1',
          nomeUsuario: 'Ana',
          categoriaAcerto: 'ACERTO_DE_RESULTADO',
          pontosBase: 1,
        },
        criarCtx(),
        destaques,
      );
      expect(destaques).toEqual([]);
    });
  });
});

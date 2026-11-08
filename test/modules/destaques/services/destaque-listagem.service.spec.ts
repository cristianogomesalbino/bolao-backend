import { describe, expect, it, beforeEach, vi } from 'vitest';
import { DestaqueListagemService } from '../../../../src/modules/destaques/services/destaque-listagem.service';
import { InMemoryDestaqueRepository } from '../../../../src/modules/destaques/repositories/in-memory-destaque.repository';
import type { DestaqueSequenciaService } from '../../../../src/modules/destaques/services/destaque-sequencia.service';
import type { JogoRepository } from '../../../../src/modules/jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../../../src/modules/jogos/repositories/fase.repository.interface';
import type { GrupoRepository } from '../../../../src/modules/grupos/repositories/grupo.repository.interface';

describe('DestaqueListagemService', () => {
  let service: DestaqueListagemService;
  let destaqueRepo: InMemoryDestaqueRepository;
  let sequenciaService: {
    calcularMelhoresSequenciasBatch: ReturnType<typeof vi.fn>;
    listarEsquecidosBatch: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    destaqueRepo = new InMemoryDestaqueRepository();
    destaqueRepo.setUsuario('user-1', 'Ana');
    sequenciaService = {
      calcularMelhoresSequenciasBatch: vi.fn().mockResolvedValue(new Map()),
      listarEsquecidosBatch: vi.fn().mockResolvedValue(new Map()),
    };

    const grupoRepo = {
      buscarPorId: vi.fn().mockResolvedValue({
        id: 'grupo-1',
        temporadaId: 'temp-1',
      }),
    };
    const faseRepo = {
      buscarPorTemporada: vi
        .fn()
        .mockResolvedValue([{ id: 'fase-1', tipo: 'PONTOS_CORRIDOS' }]),
    };
    const jogoRepo = {
      buscarMaiorRodadaFinalizada: vi.fn().mockResolvedValue(5),
    };

    service = new DestaqueListagemService(
      destaqueRepo,
      jogoRepo as unknown as JogoRepository,
      faseRepo as unknown as FaseRepository,
      grupoRepo as unknown as GrupoRepository,
      sequenciaService as unknown as DestaqueSequenciaService,
    );

    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-1',
      jogoId: 'jogo-1',
      rodada: 5,
      tipo: 'ACERTOU_EM_CHEIO',
      titulo: 'Cravou',
      dados: { golsCasa: 1, golsFora: 0, jogoId: 'jogo-1' },
    });
    await destaqueRepo.criar({
      grupoId: 'grupo-2',
      usuarioId: 'user-1',
      jogoId: 'jogo-2',
      rodada: 5,
      tipo: 'NAO_PALPITOU',
      titulo: 'Esqueceu',
      dados: { jogosEsquecidos: [] },
    });
  });

  it('lista destaques da rodada atual do grupo', async () => {
    const resultado = await service.listar('grupo-1', 'user-1');
    expect(resultado.destaques).toHaveLength(1);
    expect(resultado.destaques[0].tipo).toBe('ACERTOU_EM_CHEIO');
    expect(resultado.rodadasDisponiveis).toEqual([5]);
  });

  it('permite F nas rodadas do filtro (até 2 disponíveis)', async () => {
    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-1',
      jogoId: 'jogo-antigo',
      rodada: 4,
      tipo: 'NAO_PALPITOU',
      titulo: 'Sumiu',
      dados: { jogosEsquecidos: [] },
    });
    const rodadas = await service.obterRodadasVisiveis('grupo-1');
    expect(rodadas).toEqual([5, 4]);
  });

  it('só registra visualizações de IDs do próprio grupo', async () => {
    const ids = destaqueRepo.destaques.map((d) => d.id);
    const resultado = await service.marcarVisualizados(
      'grupo-1',
      'user-viewer',
      ids,
    );
    expect(resultado.registrados).toBe(1);
    const visualizados = await destaqueRepo.buscarVisualizacoes(
      ids,
      'user-viewer',
    );
    expect(visualizados.size).toBe(1);
    expect(visualizados.has(ids[0])).toBe(true);
  });

  it('preview por ?rodada= usa só a rodada pedida', async () => {
    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-1',
      jogoId: 'jogo-r4',
      rodada: 4,
      tipo: 'DOBROU_E_ACERTOU',
      titulo: 'Dobrou',
      dados: {},
    });

    const resultado = await service.listar('grupo-1', 'user-1', '4');
    expect(resultado.destaques).toHaveLength(1);
    expect(resultado.destaques[0].tipo).toBe('DOBROU_E_ACERTOU');
  });

  it('sincroniza NAO_PALPITOU via batch e descarta sem esquecidos', async () => {
    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-1',
      jogoId: 'jogo-np',
      rodada: 5,
      tipo: 'NAO_PALPITOU',
      titulo: 'Sumiu',
      dados: { jogosEsquecidos: [] },
    });
    sequenciaService.listarEsquecidosBatch.mockResolvedValue(
      new Map([
        [
          'user-1',
          [
            {
              jogoId: 'jogo-np',
              timeCasa: { nome: 'A', sigla: 'A', escudo: null },
              timeFora: { nome: 'B', sigla: 'B', escudo: null },
              golsCasa: 1,
              golsFora: 0,
            },
          ],
        ],
      ]),
    );

    const comEsquecidos = await service.listar('grupo-1', 'user-1');
    expect(comEsquecidos.destaques.some((d) => d.tipo === 'NAO_PALPITOU')).toBe(
      true,
    );

    sequenciaService.listarEsquecidosBatch.mockResolvedValue(
      new Map([['user-1', []]]),
    );
    const semEsquecidos = await service.listar('grupo-1', 'user-1');
    expect(semEsquecidos.destaques.some((d) => d.tipo === 'NAO_PALPITOU')).toBe(
      false,
    );
  });

  it('atualiza SEQUENCIA_RESULTADO com melhor do batch', async () => {
    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-1',
      jogoId: 'jogo-seq',
      rodada: 5,
      tipo: 'SEQUENCIA_RESULTADO',
      titulo: 'Seq',
      dados: { quantidadeAcertos: 1, pontos: 1 },
    });
    sequenciaService.calcularMelhoresSequenciasBatch.mockResolvedValue(
      new Map([
        [
          'user-1',
          {
            quantidade: 4,
            pontos: 8,
            rodadaInicio: 4,
            rodadaFim: 5,
            ultimosJogos: [],
          },
        ],
      ]),
    );

    const resultado = await service.listar('grupo-1', 'user-1');
    const seq = resultado.destaques.find(
      (d) => d.tipo === 'SEQUENCIA_RESULTADO',
    );
    expect(seq?.dados).toMatchObject({
      quantidadeAcertos: 4,
      pontos: 8,
      rodadaInicio: 4,
      rodadaFim: 5,
    });
  });

  it('fallback de rodadas visíveis usa rodada atual quando não há destaques', async () => {
    const repoVazio = new InMemoryDestaqueRepository();
    const local = new DestaqueListagemService(
      repoVazio,
      {
        buscarMaiorRodadaFinalizada: vi.fn().mockResolvedValue(7),
      } as unknown as JogoRepository,
      {
        buscarPorTemporada: vi
          .fn()
          .mockResolvedValue([{ id: 'fase-1', tipo: 'PONTOS_CORRIDOS' }]),
      } as unknown as FaseRepository,
      {
        buscarPorId: vi.fn().mockResolvedValue({
          id: 'grupo-x',
          temporadaId: 'temp-1',
        }),
      } as unknown as GrupoRepository,
      sequenciaService as unknown as DestaqueSequenciaService,
    );

    await expect(local.obterRodadasVisiveis('grupo-x')).resolves.toEqual([7]);
  });
});

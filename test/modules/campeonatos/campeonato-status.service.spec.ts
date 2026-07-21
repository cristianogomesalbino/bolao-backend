import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampeonatoStatusService } from '@src/modules/campeonatos/services/campeonato-status.service';
import { InMemoryCampeonatoRepository } from '@src/modules/campeonatos/repositories/in-memory-campeonato.repository';
import type { FaseRepository } from '@src/modules/jogos/repositories/fase.repository.interface';
import type { JogoRepository } from '@src/modules/jogos/repositories/jogo.repository.interface';

function criarFaseRepoMock(): FaseRepository {
  return {
    criar: vi.fn(),
    criarVarios: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(null),
    buscarPorTemporada: vi.fn().mockResolvedValue([]),
    buscarPorCampeonatoENome: vi.fn().mockResolvedValue(null),
  };
}

function criarJogoRepoMock(): JogoRepository {
  return {
    criar: vi.fn(),
    atualizar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorIds: vi.fn(),
    buscarPorExternoIds: vi.fn(),
    buscarPorFase: vi.fn().mockResolvedValue([]),
    buscarPorFaseAteRodada: vi.fn(),
    buscarPorFaseEStatus: vi.fn(),
    buscarPorExternoId: vi.fn(),
    buscarPorGrupoIdaVolta: vi.fn(),
    buscarProximoJogoPorTemporada: vi.fn(),
    buscarProximosJogosPorTemporada: vi.fn(),
    contarAdiadosPorTemporada: vi.fn(),
    buscarTodosPorTemporada: vi.fn(),
    buscarRodadaAtual: vi.fn(),
    buscarPendentesSync: vi.fn(),
    buscarJogosComTimePlaceholder: vi.fn(),
    buscarAgendadosEntre: vi.fn(),
    contarAtrasados: vi.fn(),
    contarEmAndamento: vi.fn(),
    buscarProximoAgendado: vi.fn(),
  };
}

describe('CampeonatoStatusService', () => {
  let service: CampeonatoStatusService;
  let campeonatoRepo: InMemoryCampeonatoRepository;
  let faseRepo: ReturnType<typeof criarFaseRepoMock>;
  let jogoRepo: ReturnType<typeof criarJogoRepoMock>;

  beforeEach(() => {
    campeonatoRepo = new InMemoryCampeonatoRepository();
    faseRepo = criarFaseRepoMock();
    jogoRepo = criarJogoRepoMock();
    service = new CampeonatoStatusService(campeonatoRepo, faseRepo, jogoRepo);
  });

  describe('verificarInicioCampeonato', () => {
    it('deve marcar campeonato como EM_ANDAMENTO quando status é NAO_INICIADO', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Copa' });
      vi.mocked(faseRepo.buscarPorId).mockResolvedValue({
        id: 'fase-1',
        nome: 'Grupo A',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
        idaVolta: false,
        temporadaId: 'temp-1',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        temporada: {
          id: 'temp-1',
          ano: 2026,
          campeonato: { id: campeonato.id, nome: 'Copa' },
        },
      });

      await service.verificarInicioCampeonato('fase-1');

      const atualizado = await campeonatoRepo.buscarPorId(campeonato.id);
      expect(atualizado?.status).toBe('EM_ANDAMENTO');
    });

    it('não deve alterar se campeonato já está EM_ANDAMENTO', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Copa' });
      await campeonatoRepo.atualizarStatus(campeonato.id, 'EM_ANDAMENTO');

      vi.mocked(faseRepo.buscarPorId).mockResolvedValue({
        id: 'fase-1',
        nome: 'Grupo A',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
        idaVolta: false,
        temporadaId: 'temp-1',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        temporada: {
          id: 'temp-1',
          ano: 2026,
          campeonato: { id: campeonato.id, nome: 'Copa' },
        },
      });

      await service.verificarInicioCampeonato('fase-1');

      const atualizado = await campeonatoRepo.buscarPorId(campeonato.id);
      expect(atualizado?.status).toBe('EM_ANDAMENTO');
    });

    it('não deve alterar se fase não encontrada', async () => {
      await service.verificarInicioCampeonato('fase-inexistente');
      expect(campeonatoRepo.items).toHaveLength(0);
    });
  });

  describe('verificarFinalizacaoCampeonato', () => {
    it('deve finalizar campeonato quando fase Final (mata-mata) tem todos jogos finalizados', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Copa' });
      await campeonatoRepo.atualizarStatus(campeonato.id, 'EM_ANDAMENTO');

      vi.mocked(faseRepo.buscarPorId).mockResolvedValue({
        id: 'fase-final',
        nome: 'Final',
        tipo: 'MATA_MATA',
        ordem: 7,
        idaVolta: false,
        temporadaId: 'temp-1',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        temporada: {
          id: 'temp-1',
          ano: 2026,
          campeonato: { id: campeonato.id, nome: 'Copa' },
        },
      });

      vi.mocked(jogoRepo.buscarPorFase).mockResolvedValue([
        {
          id: 'jogo-final',
          faseId: 'fase-final',
          status: 'FINALIZADO',
          rodada: 1,
          timeCasaId: 'a',
          timeForaId: 'b',
          dataHora: new Date(),
          golsCasa: 2,
          golsFora: 1,
        },
      ] as never);

      await service.verificarFinalizacaoCampeonato('fase-final');

      const atualizado = await campeonatoRepo.buscarPorId(campeonato.id);
      expect(atualizado?.status).toBe('FINALIZADO');
    });

    it('não deve finalizar se fase não é Final (mata-mata)', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Copa' });
      await campeonatoRepo.atualizarStatus(campeonato.id, 'EM_ANDAMENTO');

      vi.mocked(faseRepo.buscarPorId).mockResolvedValue({
        id: 'fase-oitavas',
        nome: 'Oitavas de Final',
        tipo: 'MATA_MATA',
        ordem: 3,
        idaVolta: false,
        temporadaId: 'temp-1',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        temporada: {
          id: 'temp-1',
          ano: 2026,
          campeonato: { id: campeonato.id, nome: 'Copa' },
        },
      });

      await service.verificarFinalizacaoCampeonato('fase-oitavas');

      const atualizado = await campeonatoRepo.buscarPorId(campeonato.id);
      expect(atualizado?.status).toBe('EM_ANDAMENTO');
    });

    it('deve finalizar pontos corridos quando última rodada encerrada', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });
      await campeonatoRepo.atualizarStatus(campeonato.id, 'EM_ANDAMENTO');

      vi.mocked(faseRepo.buscarPorId).mockResolvedValue({
        id: 'fase-unica',
        nome: 'Fase Única',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
        idaVolta: false,
        temporadaId: 'temp-1',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        temporada: {
          id: 'temp-1',
          ano: 2026,
          campeonato: { id: campeonato.id, nome: 'Brasileirão' },
        },
      });

      vi.mocked(jogoRepo.buscarPorFase).mockResolvedValue([
        {
          id: 'j37',
          faseId: 'fase-unica',
          status: 'FINALIZADO',
          rodada: 37,
        },
        {
          id: 'j38-1',
          faseId: 'fase-unica',
          status: 'FINALIZADO',
          rodada: 38,
        },
        {
          id: 'j38-2',
          faseId: 'fase-unica',
          status: 'FINALIZADO',
          rodada: 38,
        },
      ] as never);

      await service.verificarFinalizacaoCampeonato('fase-unica');

      const atualizado = await campeonatoRepo.buscarPorId(campeonato.id);
      expect(atualizado?.status).toBe('FINALIZADO');
    });

    it('não deve finalizar se última rodada tem jogo agendado', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });
      await campeonatoRepo.atualizarStatus(campeonato.id, 'EM_ANDAMENTO');

      vi.mocked(faseRepo.buscarPorId).mockResolvedValue({
        id: 'fase-unica',
        nome: 'Fase Única',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
        idaVolta: false,
        temporadaId: 'temp-1',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        temporada: {
          id: 'temp-1',
          ano: 2026,
          campeonato: { id: campeonato.id, nome: 'Brasileirão' },
        },
      });

      vi.mocked(jogoRepo.buscarPorFase).mockResolvedValue([
        {
          id: 'j38-ok',
          faseId: 'fase-unica',
          status: 'FINALIZADO',
          rodada: 38,
        },
        {
          id: 'j38-pend',
          faseId: 'fase-unica',
          status: 'AGENDADO',
          rodada: 38,
        },
      ] as never);

      await service.verificarFinalizacaoCampeonato('fase-unica');

      const atualizado = await campeonatoRepo.buscarPorId(campeonato.id);
      expect(atualizado?.status).toBe('EM_ANDAMENTO');
    });

    it('não deve processar se já FINALIZADO (idempotência)', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Copa' });
      await campeonatoRepo.atualizarStatus(campeonato.id, 'FINALIZADO');

      vi.mocked(faseRepo.buscarPorId).mockResolvedValue({
        id: 'fase-final',
        nome: 'Final',
        tipo: 'MATA_MATA',
        ordem: 7,
        idaVolta: false,
        temporadaId: 'temp-1',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        temporada: {
          id: 'temp-1',
          ano: 2026,
          campeonato: { id: campeonato.id, nome: 'Copa' },
        },
      });

      await service.verificarFinalizacaoCampeonato('fase-final');

      expect(jogoRepo.buscarPorFase).not.toHaveBeenCalled();
    });
  });
});

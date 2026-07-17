import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { JogoService } from '@src/modules/jogos/services/jogo.service';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryTimeRepository } from '@src/modules/times/repositories/in-memory-time.repository';
import { FutebolApiService } from '@src/modules/jogos/services/futebol-api.service';
import {
  FaseNaoEncontradaError,
  JogoNaoEncontradoError,
  TimesIguaisError,
  JogoFinalizadoError,
  JogoCanceladoError,
  PlacarInvalidoError,
  ProrrogacaoNaoPermitidaError,
  PenaltisNaoPermitidoError,
  PlacarPenaltisEmpatadoError,
  VencedorObrigatorioError,
  TransicaoStatusInvalidaError,
  IdaVoltaNaoPermitidaError,
  JogoIdaNaoEncontradoError,
} from '@src/common/errors/domain-errors';

describe('JogoService', () => {
  let service: JogoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let timeRepo: InMemoryTimeRepository;
  let futebolApiService: FutebolApiService;

  const userId = 'user-1';

  const fasePontosCorridos = {
    id: 'fase-pc',
    nome: 'Rodada 1',
    tipo: 'PONTOS_CORRIDOS',
    ordem: 1,
    idaVolta: false,
    temporadaId: 'temp-1',
    dataCriacao: new Date(),
  };

  const faseMataMata = {
    id: 'fase-mm',
    nome: 'Quartas',
    tipo: 'MATA_MATA',
    ordem: 2,
    idaVolta: false,
    temporadaId: 'temp-1',
    dataCriacao: new Date(),
  };

  const faseMataMataIdaVolta = {
    id: 'fase-mm-iv',
    nome: 'Oitavas',
    tipo: 'MATA_MATA',
    ordem: 3,
    idaVolta: true,
    temporadaId: 'temp-1',
    dataCriacao: new Date(),
  };

  beforeEach(() => {
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    timeRepo = new InMemoryTimeRepository();
    faseRepo.items = [
      { ...fasePontosCorridos },
      { ...faseMataMata },
      { ...faseMataMataIdaVolta },
    ];

    futebolApiService = {
      buscarJogosPorRodada: vi.fn(),
      buscarJogosPorIds: vi.fn(),
      normalizarJogo: vi.fn(),
      mapearStatus: vi.fn(),
    } as any;

    service = new JogoService(jogoRepo, faseRepo, futebolApiService, timeRepo, {
      preencherProximaFaseEliminatoria: vi.fn(),
      propagarVencedoresParaProximaFase: vi.fn(),
    } as any);
  });

  // ==================== criar ====================

  describe('criar', () => {
    it('deve criar jogo com dados válidos — status AGENDADO, placar null, fonteResultado MANUAL', async () => {
      const result = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

      expect(result.status).toBe('AGENDADO');
      expect(result.golsCasa).toBeNull();
      expect(result.golsFora).toBeNull();
      expect(result.fonteResultado).toBe('MANUAL');
      expect(result.vencedorId).toBeNull();
      expect(result.timeCasaId).toBe('time-a');
      expect(result.timeForaId).toBe('time-b');
      expect(result.criadoPor).toBe(userId);
    });

    it('deve lançar TimesIguaisError se times iguais', async () => {
      await expect(
        service.criar(
          {
            faseId: 'fase-pc',
            timeCasaId: 'time-a',
            timeForaId: 'time-a',
            dataHora: '2026-03-15T16:00:00.000Z',
          },
          userId,
        ),
      ).rejects.toThrow(TimesIguaisError);
    });

    it('deve lançar FaseNaoEncontradaError se faseId inexistente', async () => {
      await expect(
        service.criar(
          {
            faseId: 'inexistente',
            timeCasaId: 'time-a',
            timeForaId: 'time-b',
            dataHora: '2026-03-15T16:00:00.000Z',
          },
          userId,
        ),
      ).rejects.toThrow(FaseNaoEncontradaError);
    });

    it('deve criar jogo em fase PONTOS_CORRIDOS com grupoIdaVolta null e ehJogoVolta false', async () => {
      const result = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
          grupoIdaVolta: 'grupo-1',
          ehJogoVolta: true,
        },
        userId,
      );

      expect(result.grupoIdaVolta).toBeNull();
      expect(result.ehJogoVolta).toBe(false);
    });

    it('deve lançar JogoIdaNaoEncontradoError se jogo de volta sem jogo de ida', async () => {
      await expect(
        service.criar(
          {
            faseId: 'fase-mm-iv',
            timeCasaId: 'time-a',
            timeForaId: 'time-b',
            dataHora: '2026-03-15T16:00:00.000Z',
            grupoIdaVolta: 'grupo-1',
            ehJogoVolta: true,
          },
          userId,
        ),
      ).rejects.toThrow(JogoIdaNaoEncontradoError);
    });

    it('deve lançar IdaVoltaNaoPermitidaError se jogo de volta em fase sem idaVolta', async () => {
      await expect(
        service.criar(
          {
            faseId: 'fase-mm',
            timeCasaId: 'time-a',
            timeForaId: 'time-b',
            dataHora: '2026-03-15T16:00:00.000Z',
            ehJogoVolta: true,
          },
          userId,
        ),
      ).rejects.toThrow(IdaVoltaNaoPermitidaError);
    });
  });

  // ==================== atualizar ====================

  describe('atualizar', () => {
    it('deve atualizar jogo AGENDADO com sucesso', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

      const result = await service.atualizar(jogo.id, {
        dataHora: '2026-04-01T20:00:00.000Z',
      });

      expect(result.dataHora).toBe('2026-04-01T20:00:00.000Z');
    });

    it('deve lançar JogoFinalizadoError ao atualizar jogo FINALIZADO', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );
      await jogoRepo.atualizar(jogo.id, { status: 'FINALIZADO' });

      await expect(
        service.atualizar(jogo.id, { dataHora: '2026-04-01T20:00:00.000Z' }),
      ).rejects.toThrow(JogoFinalizadoError);
    });

    it('deve lançar JogoCanceladoError ao atualizar jogo CANCELADO', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );
      await jogoRepo.atualizar(jogo.id, { status: 'CANCELADO' });

      await expect(
        service.atualizar(jogo.id, { dataHora: '2026-04-01T20:00:00.000Z' }),
      ).rejects.toThrow(JogoCanceladoError);
    });

    it('deve lançar TimesIguaisError ao atualizar com times iguais', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

      await expect(
        service.atualizar(jogo.id, { timeCasaId: 'time-b' }),
      ).rejects.toThrow(TimesIguaisError);
    });

    it('deve lançar JogoNaoEncontradoError ao atualizar jogo inexistente', async () => {
      await expect(
        service.atualizar('inexistente', {
          dataHora: '2026-04-01T20:00:00.000Z',
        }),
      ).rejects.toThrow(JogoNaoEncontradoError);
    });

    it('deve mudar fonteResultado para MANUAL ao atualizar jogo API_EXTERNA', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );
      await jogoRepo.atualizar(jogo.id, { fonteResultado: 'API_EXTERNA' });

      const result = await service.atualizar(jogo.id, {
        dataHora: '2026-04-01T20:00:00.000Z',
      });

      expect(result.fonteResultado).toBe('MANUAL');
    });
  });

  // ==================== transições de status ====================

  describe('transições de status', () => {
    it('AGENDADO → EM_ANDAMENTO deve ser válido', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

      const result = await service.atualizar(jogo.id, {
        status: 'EM_ANDAMENTO',
      });

      expect(result.status).toBe('EM_ANDAMENTO');
    });

    it('AGENDADO → CANCELADO deve ser válido', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

      const result = await service.atualizar(jogo.id, { status: 'CANCELADO' });

      expect(result.status).toBe('CANCELADO');
    });

    it('EM_ANDAMENTO → FINALIZADO deve ser válido via atualizar', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      const result = await service.atualizar(jogo.id, { status: 'FINALIZADO' });

      expect(result.status).toBe('FINALIZADO');
    });

    it('FINALIZADO → AGENDADO deve lançar TransicaoStatusInvalidaError', () => {
      expect(() =>
        service.validarTransicaoStatus('FINALIZADO', 'AGENDADO'),
      ).toThrow(TransicaoStatusInvalidaError);
    });
  });

  // ==================== finalização pontos corridos ====================

  describe('finalização pontos corridos', () => {
    const criarJogoPC = () =>
      service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

    it('vitória casa (2x1) → vencedorId = timeCasaId', async () => {
      const jogo = await criarJogoPC();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      const result = await service.finalizar(jogo.id, {
        golsCasa: 2,
        golsFora: 1,
      });

      expect(result.vencedorId).toBe('time-a');
      expect(result.status).toBe('FINALIZADO');
    });

    it('vitória fora (0x3) → vencedorId = timeForaId', async () => {
      const jogo = await criarJogoPC();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      const result = await service.finalizar(jogo.id, {
        golsCasa: 0,
        golsFora: 3,
      });

      expect(result.vencedorId).toBe('time-b');
    });

    it('empate (1x1) → vencedorId = null', async () => {
      const jogo = await criarJogoPC();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      const result = await service.finalizar(jogo.id, {
        golsCasa: 1,
        golsFora: 1,
      });

      expect(result.vencedorId).toBeNull();
    });

    it('placar negativo → PlacarInvalidoError', async () => {
      const jogo = await criarJogoPC();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      await expect(
        service.finalizar(jogo.id, { golsCasa: -1, golsFora: 0 }),
      ).rejects.toThrow(PlacarInvalidoError);
    });

    it('com prorrogação → ProrrogacaoNaoPermitidaError', async () => {
      const jogo = await criarJogoPC();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      await expect(
        service.finalizar(jogo.id, {
          golsCasa: 1,
          golsFora: 1,
          temProrrogacao: true,
          golsProrrogacaoCasa: 1,
          golsProrrogacaoFora: 0,
        }),
      ).rejects.toThrow(ProrrogacaoNaoPermitidaError);
    });
  });

  // ==================== finalização mata-mata ====================

  describe('finalização mata-mata', () => {
    const criarJogoMM = () =>
      service.criar(
        {
          faseId: 'fase-mm',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

    it('sem empate (3x1) → vencedorId correto', async () => {
      const jogo = await criarJogoMM();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      const result = await service.finalizar(jogo.id, {
        golsCasa: 3,
        golsFora: 1,
      });

      expect(result.vencedorId).toBe('time-a');
      expect(result.status).toBe('FINALIZADO');
    });

    it('empate + prorrogação (1x1, 2x1) → vencedorId correto', async () => {
      const jogo = await criarJogoMM();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      const result = await service.finalizar(jogo.id, {
        golsCasa: 1,
        golsFora: 1,
        temProrrogacao: true,
        golsProrrogacaoCasa: 2,
        golsProrrogacaoFora: 1,
      });

      expect(result.vencedorId).toBe('time-a');
      expect(result.temProrrogacao).toBe(true);
    });

    it('empate + prorrogação + pênaltis (1x1, 0x0, 5x4) → vencedorId correto', async () => {
      const jogo = await criarJogoMM();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      const result = await service.finalizar(jogo.id, {
        golsCasa: 1,
        golsFora: 1,
        temProrrogacao: true,
        golsProrrogacaoCasa: 0,
        golsProrrogacaoFora: 0,
        temPenaltis: true,
        penaltisCasa: 5,
        penaltisFora: 4,
      });

      expect(result.vencedorId).toBe('time-a');
      expect(result.temPenaltis).toBe(true);
    });

    it('empate sem prorrogação → VencedorObrigatorioError', async () => {
      const jogo = await criarJogoMM();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      await expect(
        service.finalizar(jogo.id, { golsCasa: 1, golsFora: 1 }),
      ).rejects.toThrow(VencedorObrigatorioError);
    });

    it('prorrogação sem empate no TN → ProrrogacaoNaoPermitidaError', async () => {
      const jogo = await criarJogoMM();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      await expect(
        service.finalizar(jogo.id, {
          golsCasa: 2,
          golsFora: 1,
          temProrrogacao: true,
          golsProrrogacaoCasa: 1,
          golsProrrogacaoFora: 0,
        }),
      ).rejects.toThrow(ProrrogacaoNaoPermitidaError);
    });

    it('pênaltis sem empate na prorrogação → PenaltisNaoPermitidoError', async () => {
      const jogo = await criarJogoMM();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      await expect(
        service.finalizar(jogo.id, {
          golsCasa: 1,
          golsFora: 1,
          temProrrogacao: true,
          golsProrrogacaoCasa: 2,
          golsProrrogacaoFora: 1,
          temPenaltis: true,
          penaltisCasa: 5,
          penaltisFora: 4,
        }),
      ).rejects.toThrow(PenaltisNaoPermitidoError);
    });

    it('pênaltis empatados → PlacarPenaltisEmpatadoError', async () => {
      const jogo = await criarJogoMM();
      await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

      await expect(
        service.finalizar(jogo.id, {
          golsCasa: 1,
          golsFora: 1,
          temProrrogacao: true,
          golsProrrogacaoCasa: 0,
          golsProrrogacaoFora: 0,
          temPenaltis: true,
          penaltisCasa: 4,
          penaltisFora: 4,
        }),
      ).rejects.toThrow(PlacarPenaltisEmpatadoError);
    });
  });

  // ==================== ida e volta ====================

  describe('ida e volta', () => {
    it('finalizar jogo de ida → vencedorId null', async () => {
      const jogoIda = await service.criar(
        {
          faseId: 'fase-mm-iv',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
          grupoIdaVolta: 'grupo-1',
          ehJogoVolta: false,
        },
        userId,
      );
      await jogoRepo.atualizar(jogoIda.id, { status: 'EM_ANDAMENTO' });

      const result = await service.finalizar(jogoIda.id, {
        golsCasa: 2,
        golsFora: 1,
      });

      expect(result.vencedorId).toBeNull();
      expect(result.status).toBe('FINALIZADO');
    });

    it('finalizar jogo de volta → vencedor por placar agregado', async () => {
      // Jogo de ida: time-a 2 x 1 time-b
      const jogoIda = await service.criar(
        {
          faseId: 'fase-mm-iv',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
          grupoIdaVolta: 'grupo-1',
          ehJogoVolta: false,
        },
        userId,
      );
      await jogoRepo.atualizar(jogoIda.id, { status: 'EM_ANDAMENTO' });
      await service.finalizar(jogoIda.id, { golsCasa: 2, golsFora: 1 });

      // Jogo de volta: time-b 3 x 0 time-a
      // Agregado: time-a = 2 + 0 = 2, time-b = 1 + 3 = 4
      const jogoVolta = await service.criar(
        {
          faseId: 'fase-mm-iv',
          timeCasaId: 'time-b',
          timeForaId: 'time-a',
          dataHora: '2026-03-20T16:00:00.000Z',
          grupoIdaVolta: 'grupo-1',
          ehJogoVolta: true,
        },
        userId,
      );
      await jogoRepo.atualizar(jogoVolta.id, { status: 'EM_ANDAMENTO' });

      const result = await service.finalizar(jogoVolta.id, {
        golsCasa: 3,
        golsFora: 0,
      });

      expect(result.vencedorId).toBe('time-b');
    });

    it('finalizar jogo de volta com jogo de ida não finalizado → JogoIdaNaoEncontradoError', async () => {
      const _jogoIda = await service.criar(
        {
          faseId: 'fase-mm-iv',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
          grupoIdaVolta: 'grupo-1',
          ehJogoVolta: false,
        },
        userId,
      );

      const jogoVolta = await service.criar(
        {
          faseId: 'fase-mm-iv',
          timeCasaId: 'time-b',
          timeForaId: 'time-a',
          dataHora: '2026-03-20T16:00:00.000Z',
          grupoIdaVolta: 'grupo-1',
          ehJogoVolta: true,
        },
        userId,
      );
      await jogoRepo.atualizar(jogoVolta.id, { status: 'EM_ANDAMENTO' });

      await expect(
        service.finalizar(jogoVolta.id, { golsCasa: 1, golsFora: 0 }),
      ).rejects.toThrow(JogoIdaNaoEncontradoError);
    });
  });

  // ==================== calcularVencedor ====================

  describe('calcularVencedor', () => {
    it('jogo não finalizado → null', () => {
      const result = service.calcularVencedor({
        status: 'EM_ANDAMENTO',
        golsCasa: 2,
        golsFora: 1,
        timeCasaId: 'time-a',
        timeForaId: 'time-b',
      });

      expect(result).toBeNull();
    });

    it('vitória no tempo normal → timeCasaId', () => {
      const result = service.calcularVencedor({
        status: 'FINALIZADO',
        golsCasa: 2,
        golsFora: 1,
        timeCasaId: 'time-a',
        timeForaId: 'time-b',
        temProrrogacao: false,
      });

      expect(result).toBe('time-a');
    });

    it('vitória no tempo normal → timeForaId', () => {
      const result = service.calcularVencedor({
        status: 'FINALIZADO',
        golsCasa: 0,
        golsFora: 2,
        timeCasaId: 'time-a',
        timeForaId: 'time-b',
        temProrrogacao: false,
      });

      expect(result).toBe('time-b');
    });

    it('vitória na prorrogação → correto', () => {
      const result = service.calcularVencedor({
        status: 'FINALIZADO',
        golsCasa: 1,
        golsFora: 1,
        timeCasaId: 'time-a',
        timeForaId: 'time-b',
        temProrrogacao: true,
        golsProrrogacaoCasa: 2,
        golsProrrogacaoFora: 1,
        temPenaltis: false,
      });

      expect(result).toBe('time-a');
    });

    it('vitória nos pênaltis → correto', () => {
      const result = service.calcularVencedor({
        status: 'FINALIZADO',
        golsCasa: 1,
        golsFora: 1,
        timeCasaId: 'time-a',
        timeForaId: 'time-b',
        temProrrogacao: true,
        golsProrrogacaoCasa: 0,
        golsProrrogacaoFora: 0,
        temPenaltis: true,
        penaltisCasa: 5,
        penaltisFora: 3,
      });

      expect(result).toBe('time-a');
    });
  });

  // ==================== busca ====================

  describe('busca', () => {
    it('buscarPorFase retorna jogos ordenados por dataHora', async () => {
      await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-20T16:00:00.000Z',
        },
        userId,
      );
      await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-c',
          timeForaId: 'time-d',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

      const result = await service.buscarPorFase('fase-pc');

      expect(result).toHaveLength(2);
      expect(new Date(result[0].dataHora).getTime()).toBeLessThanOrEqual(
        new Date(result[1].dataHora).getTime(),
      );
    });

    it('buscarPorId existente', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

      const result = await service.buscarPorId(jogo.id);

      expect(result.id).toBe(jogo.id);
    });

    it('buscarPorId inexistente → JogoNaoEncontradoError', async () => {
      await expect(service.buscarPorId('inexistente')).rejects.toThrow(
        JogoNaoEncontradoError,
      );
    });
  });

  // ==================== resetarFonte ====================

  describe('resetarFonte', () => {
    it('jogo com externoId → sucesso', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );
      await jogoRepo.atualizar(jogo.id, {
        externoId: '12345',
        fonteResultado: 'MANUAL',
      });

      const result = await service.resetarFonte(jogo.id);

      expect(result.fonteResultado).toBe('API_EXTERNA');
    });

    it('jogo sem externoId → erro BadRequestException', async () => {
      const jogo = await service.criar(
        {
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        },
        userId,
      );

      await expect(service.resetarFonte(jogo.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('jogo inexistente → JogoNaoEncontradoError', async () => {
      await expect(service.resetarFonte('inexistente')).rejects.toThrow(
        JogoNaoEncontradoError,
      );
    });
  });
});

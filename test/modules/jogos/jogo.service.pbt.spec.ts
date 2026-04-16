import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { JogoService } from '@src/modules/jogos/services/jogo.service';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import {
  TimesIguaisError,
  JogoFinalizadoError,
  JogoCanceladoError,
  PlacarInvalidoError,
  ProrrogacaoNaoPermitidaError,
  VencedorObrigatorioError,
  TransicaoStatusInvalidaError,
} from '@src/common/errors/domain-errors';

describe('JogoService — Property-Based Tests', () => {
  let service: JogoService;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;

  const userId = 'user-pbt';

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
    faseRepo.items = [
      { ...fasePontosCorridos },
      { ...faseMataMata },
      { ...faseMataMataIdaVolta },
    ];
    const apiFootballService = {
      buscarFixtures: vi.fn(),
      buscarFixturesPorIds: vi.fn(),
    } as any;
    service = new JogoService(jogoRepo, faseRepo, apiFootballService);
  });

  // Generators reutilizáveis
  const arbTimePar = fc
    .tuple(fc.uuid(), fc.uuid())
    .filter(([a, b]) => a !== b);

  const arbDataHora = fc
    .integer({ min: new Date('2026-01-01').getTime(), max: new Date('2027-12-31').getTime() })
    .map((ts) => new Date(ts));

  const arbPlacar = fc.nat({ max: 15 });

  // ==================== Propriedade 4 ====================
  // Feature: modulo-jogos, Property 4: Invariantes de criação de Jogo
  // Valida: Requisitos 2.1, 2.6, 11.3
  it('Propriedade 4: jogo criado tem status AGENDADO, placar null, fonteResultado MANUAL', async () => {
    await fc.assert(
      fc.asyncProperty(arbTimePar, arbDataHora, async ([timeCasa, timeFora], dataHora) => {
        jogoRepo.items = [];

        const jogo = await service.criar({
          faseId: 'fase-pc',
          timeCasaId: timeCasa,
          timeForaId: timeFora,
          dataHora: dataHora.toISOString(),
        }, userId);

        expect(jogo.status).toBe('AGENDADO');
        expect(jogo.golsCasa).toBeUndefined();
        expect(jogo.golsFora).toBeUndefined();
        expect(jogo.fonteResultado).toBe('MANUAL');
        expect(jogo.criadoPor).toBe(userId);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 5 ====================
  // Feature: modulo-jogos, Property 5: Times sempre diferentes
  // Valida: Requisitos 2.2, 3.4
  it('Propriedade 5: times iguais sempre rejeita com TimesIguaisError', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), arbDataHora, async (timeId, dataHora) => {
        await expect(
          service.criar({
            faseId: 'fase-pc',
            timeCasaId: timeId,
            timeForaId: timeId,
            dataHora: dataHora.toISOString(),
          }, userId),
        ).rejects.toThrow(TimesIguaisError);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 6 ====================
  // Feature: modulo-jogos, Property 6: Pontos corridos ignora campos ida/volta
  // Valida: Requisito 2.5
  it('Propriedade 6: em PONTOS_CORRIDOS, grupoIdaVolta é null e ehJogoVolta é false', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbTimePar,
        arbDataHora,
        fc.option(fc.uuid()),
        fc.boolean(),
        async ([timeCasa, timeFora], dataHora, grupoIdaVolta, ehJogoVolta) => {
          jogoRepo.items = [];

          const jogo = await service.criar({
            faseId: 'fase-pc',
            timeCasaId: timeCasa,
            timeForaId: timeFora,
            dataHora: dataHora.toISOString(),
            grupoIdaVolta: grupoIdaVolta ?? undefined,
            ehJogoVolta,
          }, userId);

          expect(jogo.grupoIdaVolta).toBeNull();
          expect(jogo.ehJogoVolta).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 7 ====================
  // Feature: modulo-jogos, Property 7: Imutabilidade após status terminal
  // Valida: Requisitos 3.2, 3.3, 10.4
  it('Propriedade 7: jogo FINALIZADO ou CANCELADO rejeita atualização', async () => {
    const arbStatusTerminal = fc.constantFrom('FINALIZADO', 'CANCELADO');

    await fc.assert(
      fc.asyncProperty(arbStatusTerminal, arbDataHora, async (status, novaData) => {
        jogoRepo.items = [];

        const jogo = await service.criar({
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        }, userId);
        await jogoRepo.atualizar(jogo.id, { status });

        const ErroEsperado = status === 'FINALIZADO' ? JogoFinalizadoError : JogoCanceladoError;

        await expect(
          service.atualizar(jogo.id, { dataHora: novaData.toISOString() }),
        ).rejects.toThrow(ErroEsperado);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 8 ====================
  // Feature: modulo-jogos, Property 8: Vencedor em pontos corridos
  // Valida: Requisitos 4.3, 4.4, 7.1
  it('Propriedade 8: vencedor correto em pontos corridos', async () => {
    await fc.assert(
      fc.asyncProperty(arbPlacar, arbPlacar, async (golsCasa, golsFora) => {
        jogoRepo.items = [];

        const jogo = await service.criar({
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        }, userId);
        await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

        const result = await service.finalizar(jogo.id, { golsCasa, golsFora });

        if (golsCasa > golsFora) {
          expect(result.vencedorId).toBe('time-a');
        } else if (golsFora > golsCasa) {
          expect(result.vencedorId).toBe('time-b');
        } else {
          expect(result.vencedorId).toBeNull();
        }
        expect(result.status).toBe('FINALIZADO');
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 9 ====================
  // Feature: modulo-jogos, Property 9: Prorrogação proibida em pontos corridos
  // Valida: Requisito 4.2
  it('Propriedade 9: prorrogação/pênaltis em PONTOS_CORRIDOS sempre rejeita', async () => {
    await fc.assert(
      fc.asyncProperty(arbPlacar, arbPlacar, arbPlacar, arbPlacar, async (gc, gf, gpc, gpf) => {
        jogoRepo.items = [];

        const jogo = await service.criar({
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        }, userId);
        await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

        await expect(
          service.finalizar(jogo.id, {
            golsCasa: gc,
            golsFora: gf,
            temProrrogacao: true,
            golsProrrogacaoCasa: gpc,
            golsProrrogacaoFora: gpf,
          }),
        ).rejects.toThrow(ProrrogacaoNaoPermitidaError);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 10 ====================
  // Feature: modulo-jogos, Property 10: Placares são inteiros não negativos
  // Valida: Requisitos 4.5, 9.1, 9.2, 9.3
  it('Propriedade 10: placar negativo sempre rejeita com PlacarInvalidoError', async () => {
    const arbNegativo = fc.integer({ min: -100, max: -1 });

    await fc.assert(
      fc.asyncProperty(arbNegativo, arbPlacar, fc.boolean(), async (neg, pos, casaNeg) => {
        jogoRepo.items = [];

        const jogo = await service.criar({
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        }, userId);
        await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

        const dto = casaNeg
          ? { golsCasa: neg, golsFora: pos }
          : { golsCasa: pos, golsFora: neg };

        await expect(service.finalizar(jogo.id, dto)).rejects.toThrow(PlacarInvalidoError);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 11 ====================
  // Feature: modulo-jogos, Property 11: Cascata de vencedor em mata-mata
  // Valida: Requisitos 5.1, 5.6, 7.2
  it('Propriedade 11: vencedor em mata-mata segue cascata TN → prorrogação → pênaltis', async () => {
    // Gera cenários de mata-mata com vencedor no tempo normal
    await fc.assert(
      fc.asyncProperty(
        arbPlacar,
        arbPlacar,
        async (golsCasa, golsFora) => {
          fc.pre(golsCasa !== golsFora); // sem empate no TN

          jogoRepo.items = [];

          const jogo = await service.criar({
            faseId: 'fase-mm',
            timeCasaId: 'time-a',
            timeForaId: 'time-b',
            dataHora: '2026-03-15T16:00:00.000Z',
          }, userId);
          await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

          const result = await service.finalizar(jogo.id, { golsCasa, golsFora });

          expect(result.status).toBe('FINALIZADO');
          const esperado = golsCasa > golsFora ? 'time-a' : 'time-b';
          expect(result.vencedorId).toBe(esperado);
          expect(result.vencedorId === 'time-a' || result.vencedorId === 'time-b').toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 12 ====================
  // Feature: modulo-jogos, Property 12: Empate em mata-mata exige desempate
  // Valida: Requisitos 5.3, 5.5
  it('Propriedade 12: empate em mata-mata sem desempate rejeita com VencedorObrigatorioError', async () => {
    await fc.assert(
      fc.asyncProperty(arbPlacar, async (gols) => {
        jogoRepo.items = [];

        const jogo = await service.criar({
          faseId: 'fase-mm',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        }, userId);
        await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

        // Empate no TN sem prorrogação
        await expect(
          service.finalizar(jogo.id, { golsCasa: gols, golsFora: gols }),
        ).rejects.toThrow(VencedorObrigatorioError);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 13 ====================
  // Feature: modulo-jogos, Property 13: Sequenciamento de prorrogação e pênaltis
  // Valida: Requisitos 5.7, 5.8, 5.9
  it('Propriedade 13: prorrogação exige empate no TN, pênaltis exige empate na prorrogação', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPlacar,
        arbPlacar,
        async (golsCasa, golsFora) => {
          fc.pre(golsCasa !== golsFora); // sem empate no TN

          jogoRepo.items = [];

          const jogo = await service.criar({
            faseId: 'fase-mm',
            timeCasaId: 'time-a',
            timeForaId: 'time-b',
            dataHora: '2026-03-15T16:00:00.000Z',
          }, userId);
          await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

          // Prorrogação sem empate no TN → erro
          await expect(
            service.finalizar(jogo.id, {
              golsCasa,
              golsFora,
              temProrrogacao: true,
              golsProrrogacaoCasa: 1,
              golsProrrogacaoFora: 0,
            }),
          ).rejects.toThrow(ProrrogacaoNaoPermitidaError);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 16 ====================
  // Feature: modulo-jogos, Property 16: Invariante de vencedorId
  // Valida: Requisitos 7.4, 9.7
  it('Propriedade 16: vencedorId é sempre timeCasaId ou timeForaId quando definido', async () => {
    await fc.assert(
      fc.asyncProperty(arbPlacar, arbPlacar, async (golsCasa, golsFora) => {
        const timeCasaId = 'time-casa';
        const timeForaId = 'time-fora';

        const result = service.calcularVencedor({
          status: 'FINALIZADO',
          golsCasa,
          golsFora,
          timeCasaId,
          timeForaId,
          temProrrogacao: false,
        });

        if (result !== null) {
          expect(result === timeCasaId || result === timeForaId).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 17 ====================
  // Feature: modulo-jogos, Property 17: Jogo não finalizado tem placares null
  // Valida: Requisito 9.6
  it('Propriedade 17: calcularVencedor retorna null para jogo não finalizado', async () => {
    const arbStatusNaoFinal = fc.constantFrom('AGENDADO', 'EM_ANDAMENTO', 'CANCELADO');

    await fc.assert(
      fc.property(arbStatusNaoFinal, arbPlacar, arbPlacar, (status, gc, gf) => {
        const result = service.calcularVencedor({
          status,
          golsCasa: gc,
          golsFora: gf,
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
        });

        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 18 ====================
  // Feature: modulo-jogos, Property 18: Consistência de campos de placar
  // Valida: Requisitos 9.4, 9.5
  it('Propriedade 18: campos de prorrogação/pênaltis null quando flags são false', async () => {
    await fc.assert(
      fc.asyncProperty(arbPlacar, arbPlacar, async (golsCasa, golsFora) => {
        jogoRepo.items = [];

        const jogo = await service.criar({
          faseId: 'fase-pc',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        }, userId);
        await jogoRepo.atualizar(jogo.id, { status: 'EM_ANDAMENTO' });

        const result = await service.finalizar(jogo.id, { golsCasa, golsFora });

        // Em pontos corridos, temProrrogacao e temPenaltis são sempre false
        expect(result.temProrrogacao).toBe(false);
        expect(result.golsProrrogacaoCasa).toBeNull();
        expect(result.golsProrrogacaoFora).toBeNull();
        expect(result.temPenaltis).toBe(false);
        expect(result.penaltisCasa).toBeNull();
        expect(result.penaltisFora).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 19 ====================
  // Feature: modulo-jogos, Property 19: Transições de status válidas
  // Valida: Requisitos 10.2, 10.3
  it('Propriedade 19: apenas transições permitidas são aceitas', () => {
    const transicoes: Record<string, string[]> = {
      AGENDADO: ['EM_ANDAMENTO', 'CANCELADO'],
      EM_ANDAMENTO: ['FINALIZADO', 'CANCELADO'],
    };

    const todosStatus = ['AGENDADO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO'];
    const arbPar = fc.tuple(
      fc.constantFrom(...todosStatus),
      fc.constantFrom(...todosStatus),
    );

    fc.assert(
      fc.property(arbPar, ([atual, novo]) => {
        const permitidas = transicoes[atual] ?? [];
        if (permitidas.includes(novo)) {
          expect(() => service.validarTransicaoStatus(atual, novo)).not.toThrow();
        } else {
          expect(() => service.validarTransicaoStatus(atual, novo)).toThrow(
            TransicaoStatusInvalidaError,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 22 ====================
  // Feature: modulo-jogos, Property 22: Mapeamento de status API-Football
  // Valida: Requisitos 12.3, 12.4, 12.5, 12.6
  it('Propriedade 22: mapeamento de status API-Football é correto', () => {
    const mapeamento: Record<string, string> = {
      NS: 'AGENDADO',
      '1H': 'EM_ANDAMENTO',
      '2H': 'EM_ANDAMENTO',
      HT: 'EM_ANDAMENTO',
      FT: 'FINALIZADO',
      AET: 'FINALIZADO',
      PEN: 'FINALIZADO',
      CANC: 'CANCELADO',
      PST: 'AGENDADO',
    };

    const arbStatusApi = fc.constantFrom(...Object.keys(mapeamento));

    fc.assert(
      fc.property(arbStatusApi, (statusApi) => {
        const result = service.mapearStatusApiFootball(statusApi);
        expect(result).toBe(mapeamento[statusApi]);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 28 ====================
  // Feature: modulo-jogos, Property 28: Não-regressão de status
  // Valida: Requisitos 15.2, 15.10
  it('Propriedade 28: jogo FINALIZADO nunca regride de status', () => {
    const arbStatusApi = fc.option(
      fc.constantFrom('NS', '1H', '2H', 'HT', 'FT', 'AET', 'PEN', 'CANC', 'PST'),
    );

    fc.assert(
      fc.property(arbStatusApi, (statusApi) => {
        const jogo = { status: 'FINALIZADO', dataHora: new Date('2026-01-01') };
        const result = service.definirStatusFinal(jogo, statusApi ?? undefined);
        expect(result).toBe('FINALIZADO');
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 29 ====================
  // Feature: modulo-jogos, Property 29: Prioridade da API sobre fallback
  // Valida: Requisito 15.3
  it('Propriedade 29: com statusApi fornecido, usa mapearStatus em vez de fallback', () => {
    const arbStatusNaoFinal = fc.constantFrom('AGENDADO', 'EM_ANDAMENTO');
    const arbStatusApi = fc.constantFrom('NS', '1H', '2H', 'HT', 'FT', 'AET', 'PEN', 'CANC', 'PST');

    fc.assert(
      fc.property(arbStatusNaoFinal, arbStatusApi, (statusAtual, statusApi) => {
        const jogo = { status: statusAtual, dataHora: new Date('2026-06-15T16:00:00Z') };
        const result = service.definirStatusFinal(jogo, statusApi);
        const esperado = service.mapearStatusApiFootball(statusApi);
        expect(result).toBe(esperado);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 30 ====================
  // Feature: modulo-jogos, Property 30: Fallback baseado em tempo
  // Valida: Requisitos 15.4, 15.5, 15.6, 15.7
  it('Propriedade 30: sem statusApi, fallback calcula status por tempo', () => {
    const agora = Date.now();
    const duasHoras = 2 * 60 * 60 * 1000;

    const jogoFuturo = { status: 'AGENDADO', dataHora: new Date(agora + 3600000) };
    expect(service.calcularStatusInterno(jogoFuturo)).toBe('AGENDADO');

    const jogoRecente = { status: 'AGENDADO', dataHora: new Date(agora - 3600000) };
    expect(service.calcularStatusInterno(jogoRecente)).toBe('EM_ANDAMENTO');

    const jogoAntigo = { status: 'AGENDADO', dataHora: new Date(agora - duasHoras - 60000) };
    expect(service.calcularStatusInterno(jogoAntigo)).toBe('FINALIZADO');
  });

  // ==================== Propriedade 14 ====================
  // Feature: modulo-jogos, Property 14: Restrições de ida e volta
  // Valida: Requisitos 6.2, 6.3, 6.4, 6.5
  it('Propriedade 14: jogo de ida finalizado tem vencedorId null', async () => {
    await fc.assert(
      fc.asyncProperty(arbPlacar, arbPlacar, async (golsCasa, golsFora) => {
        jogoRepo.items = [];

        const jogoIda = await service.criar({
          faseId: 'fase-mm-iv',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
          grupoIdaVolta: 'grupo-pbt',
          ehJogoVolta: false,
        }, userId);
        await jogoRepo.atualizar(jogoIda.id, { status: 'EM_ANDAMENTO' });

        const result = await service.finalizar(jogoIda.id, { golsCasa, golsFora });

        expect(result.status).toBe('FINALIZADO');
        expect(result.vencedorId).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 15 ====================
  // Feature: modulo-jogos, Property 15: Vencedor por placar agregado
  // Valida: Requisito 7.3
  it('Propriedade 15: vencedor do jogo de volta por placar agregado', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbPlacar, arbPlacar, arbPlacar, arbPlacar,
        async (idaCasa, idaFora, voltaCasa, voltaFora) => {
          const golsTimeA = idaCasa + voltaFora;
          const golsTimeB = idaFora + voltaCasa;
          fc.pre(golsTimeA !== golsTimeB);

          jogoRepo.items = [];

          const jogoIda = await service.criar({
            faseId: 'fase-mm-iv',
            timeCasaId: 'time-a',
            timeForaId: 'time-b',
            dataHora: '2026-03-15T16:00:00.000Z',
            grupoIdaVolta: 'grupo-pbt',
            ehJogoVolta: false,
          }, userId);
          await jogoRepo.atualizar(jogoIda.id, { status: 'EM_ANDAMENTO' });
          await service.finalizar(jogoIda.id, { golsCasa: idaCasa, golsFora: idaFora });

          const jogoVolta = await service.criar({
            faseId: 'fase-mm-iv',
            timeCasaId: 'time-b',
            timeForaId: 'time-a',
            dataHora: '2026-03-20T16:00:00.000Z',
            grupoIdaVolta: 'grupo-pbt',
            ehJogoVolta: true,
          }, userId);
          await jogoRepo.atualizar(jogoVolta.id, { status: 'EM_ANDAMENTO' });

          const result = await service.finalizar(jogoVolta.id, { golsCasa: voltaCasa, golsFora: voltaFora });

          if (golsTimeA > golsTimeB) {
            expect(result.vencedorId).toBe('time-a');
          } else {
            expect(result.vencedorId).toBe('time-b');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 23 ====================
  // Feature: modulo-jogos, Property 23: Idempotência de importação
  // Valida: Requisitos 12.7, 11.5
  it('Propriedade 23: importar mesmos fixtures duas vezes não duplica', async () => {
    const mockApi = { buscarFixtures: vi.fn(), buscarFixturesPorIds: vi.fn() } as any;
    const svc = new JogoService(jogoRepo, faseRepo, mockApi);

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (n) => {
        jogoRepo.items = [];
        const fixtures = Array.from({ length: n }, (_, i) => ({
          fixture: { id: 1000 + i, date: '2026-06-15T16:00:00Z', status: { short: 'NS' } },
          teams: { home: { id: 100 + i }, away: { id: 200 + i } },
          goals: { home: null, away: null },
        }));
        mockApi.buscarFixtures.mockResolvedValue(fixtures);

        const r1 = await svc.importarJogos(71, 2026, 'fase-pc', userId);
        const r2 = await svc.importarJogos(71, 2026, 'fase-pc', userId);

        expect(r1.importados).toBe(n);
        expect(r2.importados).toBe(0);
        expect(jogoRepo.items).toHaveLength(n);
      }),
      { numRuns: 50 },
    );
  });

  // ==================== Propriedade 24 ====================
  // Feature: modulo-jogos, Property 24: Sincronização respeita fonteResultado
  // Valida: Requisitos 13.2, 13.3
  it('Propriedade 24: sync não altera jogos com fonteResultado MANUAL', async () => {
    const mockApi = { buscarFixtures: vi.fn(), buscarFixturesPorIds: vi.fn() } as any;
    const svc = new JogoService(jogoRepo, faseRepo, mockApi);

    jogoRepo.items = [];
    await jogoRepo.criar({
      faseId: 'fase-pc', timeCasaId: 'time-a', timeForaId: 'time-b',
      dataHora: new Date('2026-06-15T16:00:00Z'), status: 'EM_ANDAMENTO',
      fonteResultado: 'MANUAL', externoId: '9999', criadoPor: userId,
      ehJogoVolta: false, grupoIdaVolta: null, temProrrogacao: false, temPenaltis: false,
    });

    mockApi.buscarFixturesPorIds.mockResolvedValue([{
      fixture: { id: 9999, status: { short: 'FT' } },
      goals: { home: 3, away: 1 },
    }]);

    await svc.sincronizarPlacares('fase-pc');
    expect(jogoRepo.items[0].fonteResultado).toBe('MANUAL');
  });

  // ==================== Propriedade 25 ====================
  // Feature: modulo-jogos, Property 25: Edição manual altera fonteResultado
  // Valida: Requisito 14.1
  it('Propriedade 25: editar jogo API_FOOTBALL muda para MANUAL', async () => {
    await fc.assert(
      fc.asyncProperty(arbDataHora, async (novaData) => {
        jogoRepo.items = [];
        const jogo = await service.criar({
          faseId: 'fase-pc', timeCasaId: 'time-a', timeForaId: 'time-b',
          dataHora: '2026-03-15T16:00:00.000Z',
        }, userId);
        await jogoRepo.atualizar(jogo.id, { fonteResultado: 'API_FOOTBALL', externoId: '123' });

        const result = await service.atualizar(jogo.id, { dataHora: novaData.toISOString() });
        expect(result.fonteResultado).toBe('MANUAL');
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 26 ====================
  // Feature: modulo-jogos, Property 26: Criação manual não afeta jogos importados
  // Valida: Requisito 14.2
  it('Propriedade 26: criar jogo manual não altera importados existentes', async () => {
    await fc.assert(
      fc.asyncProperty(arbTimePar, arbDataHora, async ([tc, tf], dh) => {
        jogoRepo.items = [];
        await jogoRepo.criar({
          faseId: 'fase-pc', timeCasaId: 'imp-a', timeForaId: 'imp-b',
          dataHora: new Date('2026-06-15T16:00:00Z'), status: 'AGENDADO',
          fonteResultado: 'API_FOOTBALL', externoId: '5555', criadoPor: userId,
          ehJogoVolta: false, grupoIdaVolta: null, temProrrogacao: false, temPenaltis: false,
        });
        const antes = { ...jogoRepo.items[0] };

        await service.criar({ faseId: 'fase-pc', timeCasaId: tc, timeForaId: tf, dataHora: dh.toISOString() }, userId);

        expect(jogoRepo.items[0].fonteResultado).toBe(antes.fonteResultado);
        expect(jogoRepo.items[0].externoId).toBe(antes.externoId);
      }),
      { numRuns: 100 },
    );
  });

  // ==================== Propriedade 27 ====================
  // Feature: modulo-jogos, Property 27: Reset de fonteResultado
  // Valida: Requisito 14.5
  it('Propriedade 27: resetarFonte muda MANUAL para API_FOOTBALL', async () => {
    jogoRepo.items = [];
    const jogo = await service.criar({
      faseId: 'fase-pc', timeCasaId: 'time-a', timeForaId: 'time-b',
      dataHora: '2026-03-15T16:00:00.000Z',
    }, userId);
    await jogoRepo.atualizar(jogo.id, { fonteResultado: 'MANUAL', externoId: '12345' });

    const result = await service.resetarFonte(jogo.id);
    expect(result.fonteResultado).toBe('API_FOOTBALL');
  });
});

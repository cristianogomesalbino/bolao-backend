import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import type { CriarJogoData } from '@src/modules/jogos/repositories/jogo.repository.interface';

function criarJogoData(overrides: Partial<CriarJogoData> = {}): CriarJogoData {
  return {
    faseId: 'fase-1',
    timeCasaId: 'time-a',
    timeForaId: 'time-b',
    dataHora: new Date('2026-08-15T20:00:00Z'),
    rodada: 1,
    status: 'AGENDADO',
    fonteResultado: 'API_EXTERNA',
    criadoPor: 'admin',
    ...overrides,
  };
}

describe('InMemoryJogoRepository', () => {
  let repo: InMemoryJogoRepository;

  beforeEach(() => {
    repo = new InMemoryJogoRepository();
  });

  describe('buscarPorFaseAteRodada', () => {
    it('deve retornar jogos até a rodada informada', async () => {
      await repo.criar(criarJogoData({ rodada: 1 }));
      await repo.criar(criarJogoData({ rodada: 2 }));
      await repo.criar(criarJogoData({ rodada: 3 }));

      const resultado = await repo.buscarPorFaseAteRodada('fase-1', 2);
      expect(resultado).toHaveLength(2);
    });

    it('deve ignorar jogos com rodada null', async () => {
      await repo.criar(criarJogoData({ rodada: 1 }));
      await repo.criar(criarJogoData({ rodada: null as unknown as number }));

      const resultado = await repo.buscarPorFaseAteRodada('fase-1', 5);
      expect(resultado).toHaveLength(1);
    });
  });

  describe('buscarPorFaseEStatus', () => {
    it('deve retornar jogos com status específico', async () => {
      await repo.criar(criarJogoData({ status: 'AGENDADO' }));
      await repo.criar(criarJogoData({ status: 'FINALIZADO' }));
      await repo.criar(criarJogoData({ status: 'AGENDADO' }));

      const resultado = await repo.buscarPorFaseEStatus('fase-1', 'AGENDADO');
      expect(resultado).toHaveLength(2);
    });

    it('deve retornar vazio se nenhum jogo com o status', async () => {
      await repo.criar(criarJogoData({ status: 'FINALIZADO' }));

      const resultado = await repo.buscarPorFaseEStatus(
        'fase-1',
        'EM_ANDAMENTO',
      );
      expect(resultado).toHaveLength(0);
    });
  });

  describe('buscarProximoJogoPorTemporada', () => {
    it('deve retornar jogo em andamento com prioridade', async () => {
      // Precisa ter fase com temporadaId
      repo.items.push({
        id: 'j1',
        faseId: 'fase-1',
        timeCasaId: 'a',
        timeForaId: 'b',
        dataHora: new Date('2026-08-10T20:00:00Z'),
        rodada: 1,
        status: 'EM_ANDAMENTO',
        golsCasa: null,
        golsFora: null,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId: null,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        foiAdiado: false,
        externoId: null,
        criadoPor: 'admin',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        fase: {
          id: 'fase-1',
          nome: 'Fase',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
        },
      });

      const resultado = await repo.buscarProximoJogoPorTemporada('temp-1');
      expect(resultado).not.toBeNull();
      expect(resultado?.id).toBe('j1');
    });

    it('deve retornar próximo agendado se nenhum em andamento', async () => {
      const futuro = new Date(Date.now() + 3600000);
      repo.items.push({
        id: 'j2',
        faseId: 'fase-1',
        timeCasaId: 'a',
        timeForaId: 'b',
        dataHora: futuro,
        rodada: 1,
        status: 'AGENDADO',
        golsCasa: null,
        golsFora: null,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId: null,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        foiAdiado: false,
        externoId: null,
        criadoPor: 'admin',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        fase: {
          id: 'fase-1',
          nome: 'Fase',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
        },
      });

      const resultado = await repo.buscarProximoJogoPorTemporada('temp-1');
      expect(resultado?.id).toBe('j2');
    });

    it('deve retornar null se nenhum jogo disponível', async () => {
      const resultado = await repo.buscarProximoJogoPorTemporada('temp-1');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarProximosJogosPorTemporada', () => {
    it('deve retornar jogos em andamento se existirem', async () => {
      repo.items.push({
        id: 'j1',
        faseId: 'fase-1',
        timeCasaId: 'a',
        timeForaId: 'b',
        dataHora: new Date(),
        rodada: 1,
        status: 'EM_ANDAMENTO',
        golsCasa: null,
        golsFora: null,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId: null,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        foiAdiado: false,
        externoId: null,
        criadoPor: 'admin',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        fase: {
          id: 'fase-1',
          nome: 'Fase',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
        },
      });

      const resultado = await repo.buscarProximosJogosPorTemporada('temp-1');
      expect(resultado).toHaveLength(1);
    });

    it('deve retornar jogos do mesmo horário se nenhum em andamento', async () => {
      const futuro = new Date(Date.now() + 3600000);
      const jogoBase = {
        faseId: 'fase-1',
        timeCasaId: 'a',
        timeForaId: 'b',
        dataHora: futuro,
        rodada: 1,
        status: 'AGENDADO',
        golsCasa: null,
        golsFora: null,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId: null,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        foiAdiado: false,
        externoId: null,
        criadoPor: 'admin',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        fase: {
          id: 'fase-1',
          nome: 'Fase',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
        },
      };

      repo.items.push({ ...jogoBase, id: 'j1' }, { ...jogoBase, id: 'j2' });

      const resultado = await repo.buscarProximosJogosPorTemporada('temp-1');
      expect(resultado).toHaveLength(2);
    });

    it('deve retornar vazio se sem jogos futuros', async () => {
      const resultado = await repo.buscarProximosJogosPorTemporada('temp-1');
      expect(resultado).toHaveLength(0);
    });
  });

  describe('contarAdiadosPorTemporada', () => {
    it('deve contar adiados anteriores à rodada atual', async () => {
      const base = {
        timeCasaId: 'a',
        timeForaId: 'b',
        golsCasa: null,
        golsFora: null,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId: null,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        foiAdiado: true,
        externoId: null,
        criadoPor: 'admin',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        fase: {
          id: 'fase-1',
          nome: 'Fase',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
        },
      };

      repo.items.push(
        {
          ...base,
          id: 'j-adiado',
          faseId: 'fase-1',
          dataHora: null,
          rodada: 2,
          status: 'ADIADO',
        },
        {
          ...base,
          id: 'j-agendado',
          faseId: 'fase-1',
          dataHora: new Date(),
          rodada: 5,
          status: 'AGENDADO',
        },
      );

      const resultado = await repo.contarAdiadosPorTemporada('temp-1');
      expect(resultado).toBe(1);
    });

    it('deve contar todos adiados se nenhum jogo ativo', async () => {
      const base = {
        timeCasaId: 'a',
        timeForaId: 'b',
        golsCasa: null,
        golsFora: null,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId: null,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        foiAdiado: true,
        externoId: null,
        criadoPor: 'admin',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        fase: {
          id: 'fase-1',
          nome: 'Fase',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
        },
      };

      repo.items.push(
        {
          ...base,
          id: 'j1',
          faseId: 'fase-1',
          dataHora: null,
          rodada: 2,
          status: 'ADIADO',
        },
        {
          ...base,
          id: 'j2',
          faseId: 'fase-1',
          dataHora: null,
          rodada: 5,
          status: 'ADIADO',
        },
      );

      const resultado = await repo.contarAdiadosPorTemporada('temp-1');
      expect(resultado).toBe(2);
    });
  });

  describe('buscarRodadaAtual', () => {
    it('deve retornar menor rodada não finalizada com dataHora', async () => {
      await repo.criar(criarJogoData({ rodada: 1, status: 'FINALIZADO' }));
      await repo.criar(criarJogoData({ rodada: 2, status: 'AGENDADO' }));
      await repo.criar(criarJogoData({ rodada: 3, status: 'AGENDADO' }));

      const resultado = await repo.buscarRodadaAtual('fase-1');
      expect(resultado).toBe(2);
    });

    it('deve retornar última rodada se tudo finalizado', async () => {
      await repo.criar(criarJogoData({ rodada: 1, status: 'FINALIZADO' }));
      await repo.criar(criarJogoData({ rodada: 2, status: 'FINALIZADO' }));

      const resultado = await repo.buscarRodadaAtual('fase-1');
      expect(resultado).toBe(2);
    });

    it('deve retornar null se não há jogos na fase', async () => {
      const resultado = await repo.buscarRodadaAtual('fase-vazia');
      expect(resultado).toBeNull();
    });
  });

  describe('contarAtrasados', () => {
    it('deve contar jogos agendados com dataHora no passado', async () => {
      const passado = new Date(Date.now() - 3600000);
      await repo.criar(
        criarJogoData({ dataHora: passado, status: 'AGENDADO' }),
      );
      await repo.criar(
        criarJogoData({
          dataHora: new Date(Date.now() + 3600000),
          status: 'AGENDADO',
        }),
      );

      const resultado = await repo.contarAtrasados();
      expect(resultado).toBe(1);
    });
  });

  describe('contarEmAndamento', () => {
    it('deve contar jogos em andamento com fonte API_EXTERNA', async () => {
      await repo.criar(criarJogoData({ status: 'EM_ANDAMENTO' }));
      await repo.criar(
        criarJogoData({ status: 'EM_ANDAMENTO', fonteResultado: 'MANUAL' }),
      );
      await repo.criar(criarJogoData({ status: 'AGENDADO' }));

      const resultado = await repo.contarEmAndamento();
      expect(resultado).toBe(1);
    });
  });

  describe('buscarProximoAgendado', () => {
    it('deve retornar próximo jogo agendado com siglas dos times', async () => {
      const futuro = new Date(Date.now() + 3600000);
      repo.items.push({
        id: 'j1',
        faseId: 'fase-1',
        timeCasaId: 'a',
        timeForaId: 'b',
        dataHora: futuro,
        rodada: 1,
        status: 'AGENDADO',
        golsCasa: null,
        golsFora: null,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId: null,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        foiAdiado: false,
        externoId: null,
        criadoPor: 'admin',
        dataCriacao: new Date(),
        atualizadoEm: new Date(),
        timeCasa: {
          id: 'a',
          nome: 'Flamengo',
          sigla: 'FLA',
          escudo: null,
          externoId: null,
        },
        timeFora: {
          id: 'b',
          nome: 'Vasco',
          sigla: 'VAS',
          escudo: null,
          externoId: null,
        },
      });

      const resultado = await repo.buscarProximoAgendado();
      expect(resultado).not.toBeNull();
      expect(resultado?.timeCasa?.sigla).toBe('FLA');
      expect(resultado?.timeFora?.sigla).toBe('VAS');
    });

    it('deve retornar null se nenhum jogo agendado futuro', async () => {
      const resultado = await repo.buscarProximoAgendado();
      expect(resultado).toBeNull();
    });
  });

  describe('buscarAgendadosEntre', () => {
    it('deve retornar jogos agendados no intervalo', async () => {
      const inicio = new Date('2026-08-15T00:00:00Z');
      const fim = new Date('2026-08-15T23:59:59Z');
      await repo.criar(
        criarJogoData({ dataHora: new Date('2026-08-15T20:00:00Z') }),
      );
      await repo.criar(
        criarJogoData({ dataHora: new Date('2026-08-16T20:00:00Z') }),
      );

      const resultado = await repo.buscarAgendadosEntre(inicio, fim);
      expect(resultado).toHaveLength(1);
    });
  });

  describe('buscarPendentesSync', () => {
    it('deve retornar jogos pendentes de sync', async () => {
      await repo.criar(
        criarJogoData({
          faseId: 'fase-1',
          rodada: 1,
          status: 'AGENDADO',
          fonteResultado: 'API_EXTERNA',
        }),
      );
      await repo.criar(
        criarJogoData({
          faseId: 'fase-1',
          rodada: 5,
          status: 'AGENDADO',
          fonteResultado: 'API_EXTERNA',
        }),
      );
      await repo.criar(
        criarJogoData({
          faseId: 'fase-1',
          rodada: 1,
          status: 'FINALIZADO',
          fonteResultado: 'API_EXTERNA',
        }),
      );

      const resultado = await repo.buscarPendentesSync(['fase-1'], 3);
      expect(resultado).toHaveLength(1);
    });
  });

  describe('buscarJogosComTimePlaceholder', () => {
    it('deve retornar jogos com time placeholder', async () => {
      await repo.criar(
        criarJogoData({ timeCasaId: 'TBD', timeForaId: 'time-b' }),
      );
      await repo.criar(
        criarJogoData({ timeCasaId: 'time-a', timeForaId: 'time-b' }),
      );

      const resultado = await repo.buscarJogosComTimePlaceholder(
        'temp-1',
        'TBD',
      );
      expect(resultado).toHaveLength(1);
    });
  });
});

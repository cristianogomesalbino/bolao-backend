import { describe, it, expect, beforeEach } from 'vitest';
import { PalpiteService } from '@src/modules/palpites/services/palpite.service';
import { InMemoryPalpiteRepository } from '@src/modules/palpites/repositories/in-memory-palpite.repository';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryGrupoRepository } from '@src/modules/grupos/repositories/in-memory-grupo.repository';
import { InMemoryGrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/in-memory-grupo-usuario.repository';
import { JogoNaoEncontradoError } from '@src/common/errors/domain-errors/jogos.errors';
import {
  PalpiteNaoEncontradoError,
  JogoNaoAceitaPalpitesError,
  PalpiteJaExisteError,
  PalpiteNaoPertenceAoUsuarioError,
  JogoNaoPertenceAoGrupoError,
} from '@src/common/errors/domain-errors/palpites.errors';

describe('PalpiteService', () => {
  let service: PalpiteService;
  let palpiteRepo: InMemoryPalpiteRepository;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let grupoRepo: InMemoryGrupoRepository;
  let grupoUsuarioRepo: InMemoryGrupoUsuarioRepository;

  const userId = 'user-1';
  const outroUserId = 'user-2';
  const temporadaId = 'temporada-1';
  const faseId = 'fase-1';
  const grupoId = 'grupo-1';

  const jogoAgendado = {
    id: 'jogo-1',
    faseId,
    timeCasaId: 'time-a',
    timeForaId: 'time-b',
    dataHora: new Date('2026-03-15T16:00:00.000Z'),
    status: 'AGENDADO',
  };

  const jogoEmAndamento = {
    id: 'jogo-2',
    faseId,
    timeCasaId: 'time-c',
    timeForaId: 'time-d',
    dataHora: new Date('2026-03-15T16:00:00.000Z'),
    status: 'EM_ANDAMENTO',
  };

  const jogoFinalizado = {
    id: 'jogo-3',
    faseId,
    timeCasaId: 'time-e',
    timeForaId: 'time-f',
    dataHora: new Date('2026-03-15T16:00:00.000Z'),
    status: 'FINALIZADO',
    golsCasa: 2,
    golsFora: 1,
  };

  const jogoOutraFase = {
    id: 'jogo-outra-fase',
    faseId: 'fase-outra',
    timeCasaId: 'time-g',
    timeForaId: 'time-h',
    dataHora: new Date('2026-03-15T16:00:00.000Z'),
    status: 'AGENDADO',
  };

  beforeEach(() => {
    palpiteRepo = new InMemoryPalpiteRepository();
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    grupoRepo = new InMemoryGrupoRepository();
    grupoUsuarioRepo = new InMemoryGrupoUsuarioRepository();

    jogoRepo.items = [
      { ...jogoAgendado },
      { ...jogoEmAndamento },
      { ...jogoFinalizado },
      { ...jogoOutraFase },
    ];

    faseRepo.items = [
      {
        id: faseId,
        temporadaId,
        nome: 'Fase 1',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
      },
      {
        id: 'fase-outra',
        temporadaId: 'temporada-outra',
        nome: 'Fase Outra',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
      },
    ];

    grupoRepo.items = [
      {
        id: grupoId,
        nome: 'Grupo 1',
        temporadaId,
        privado: false,
        codigoConvite: null,
        permitirPalpiteAutomatico: false,
        maxParticipantes: 50,
        permitirPalpiteDobrado: false,
        criadoPor: userId,
        ativo: true,
        dataCriacao: new Date(),
      },
    ];

    grupoUsuarioRepo.usuarios = [
      { id: userId, nome: 'User 1' },
      { id: outroUserId, nome: 'User 2' },
    ];
    grupoUsuarioRepo.items = [
      { usuarioId: userId, grupoId, role: 'MEMBER' },
      { usuarioId: outroUserId, grupoId, role: 'MEMBER' },
    ];

    service = new PalpiteService(
      palpiteRepo,
      jogoRepo,
      grupoUsuarioRepo,
      faseRepo,
      grupoRepo,
    );
  });

  // ==================== criar ====================

  describe('criar', () => {
    it('deve criar palpite com dados válidos', async () => {
      const result = await service.criar(
        'jogo-1',
        { golsCasa: 2, golsFora: 1 },
        userId,
      );

      expect(result.golsCasa).toBe(2);
      expect(result.golsFora).toBe(1);
      expect(result.jogoId).toBe('jogo-1');
      expect(result.usuarioId).toBe(userId);
      expect(result.id).toBeDefined();
    });

    it('deve lançar JogoNaoEncontradoError se jogo inexistente', async () => {
      await expect(
        service.criar('inexistente', { golsCasa: 1, golsFora: 0 }, userId),
      ).rejects.toThrow(JogoNaoEncontradoError);
    });

    it('deve lançar JogoNaoAceitaPalpitesError se jogo EM_ANDAMENTO', async () => {
      await expect(
        service.criar('jogo-2', { golsCasa: 1, golsFora: 0 }, userId),
      ).rejects.toThrow(JogoNaoAceitaPalpitesError);
    });

    it('deve lançar JogoNaoAceitaPalpitesError se jogo FINALIZADO', async () => {
      await expect(
        service.criar('jogo-3', { golsCasa: 1, golsFora: 0 }, userId),
      ).rejects.toThrow(JogoNaoAceitaPalpitesError);
    });

    it('deve lançar PalpiteJaExisteError se já existe palpite para o jogo', async () => {
      await service.criar('jogo-1', { golsCasa: 2, golsFora: 1 }, userId);

      await expect(
        service.criar('jogo-1', { golsCasa: 3, golsFora: 0 }, userId),
      ).rejects.toThrow(PalpiteJaExisteError);
    });
  });

  // ==================== atualizar ====================

  describe('atualizar', () => {
    it('deve atualizar palpite com dados válidos', async () => {
      const palpite = await service.criar(
        'jogo-1',
        { golsCasa: 2, golsFora: 1 },
        userId,
      );

      const result = await service.atualizar(
        palpite.id,
        { golsCasa: 3, golsFora: 0 },
        userId,
      );

      expect(result.golsCasa).toBe(3);
      expect(result.golsFora).toBe(0);
    });

    it('deve lançar PalpiteNaoEncontradoError se palpite inexistente', async () => {
      await expect(
        service.atualizar('inexistente', { golsCasa: 1, golsFora: 0 }, userId),
      ).rejects.toThrow(PalpiteNaoEncontradoError);
    });

    it('deve lançar PalpiteNaoPertenceAoUsuarioError se outro usuário', async () => {
      const palpite = await service.criar(
        'jogo-1',
        { golsCasa: 2, golsFora: 1 },
        userId,
      );

      await expect(
        service.atualizar(
          palpite.id,
          { golsCasa: 1, golsFora: 0 },
          outroUserId,
        ),
      ).rejects.toThrow(PalpiteNaoPertenceAoUsuarioError);
    });

    it('deve lançar JogoNaoAceitaPalpitesError se jogo não é AGENDADO', async () => {
      const palpite = await palpiteRepo.criar({
        usuarioId: userId,
        jogoId: 'jogo-2',
        golsCasa: 1,
        golsFora: 0,
      });

      await expect(
        service.atualizar(palpite.id, { golsCasa: 2, golsFora: 0 }, userId),
      ).rejects.toThrow(JogoNaoAceitaPalpitesError);
    });
  });

  // ==================== remover ====================

  describe('remover', () => {
    it('deve remover palpite com sucesso', async () => {
      const palpite = await service.criar(
        'jogo-1',
        { golsCasa: 2, golsFora: 1 },
        userId,
      );

      await service.remover(palpite.id, userId);

      const encontrado = await palpiteRepo.buscarPorId(palpite.id);
      expect(encontrado).toBeNull();
    });

    it('deve lançar PalpiteNaoEncontradoError se palpite inexistente', async () => {
      await expect(service.remover('inexistente', userId)).rejects.toThrow(
        PalpiteNaoEncontradoError,
      );
    });

    it('deve lançar PalpiteNaoPertenceAoUsuarioError se outro usuário', async () => {
      const palpite = await service.criar(
        'jogo-1',
        { golsCasa: 2, golsFora: 1 },
        userId,
      );

      await expect(service.remover(palpite.id, outroUserId)).rejects.toThrow(
        PalpiteNaoPertenceAoUsuarioError,
      );
    });

    it('deve lançar JogoNaoAceitaPalpitesError se jogo não é AGENDADO', async () => {
      const palpite = await palpiteRepo.criar({
        usuarioId: userId,
        jogoId: 'jogo-2',
        golsCasa: 1,
        golsFora: 0,
      });

      await expect(service.remover(palpite.id, userId)).rejects.toThrow(
        JogoNaoAceitaPalpitesError,
      );
    });
  });

  // ==================== buscarMeuPalpitePorJogo ====================

  describe('buscarMeuPalpitePorJogo', () => {
    it('deve retornar palpite existente', async () => {
      await service.criar('jogo-1', { golsCasa: 2, golsFora: 1 }, userId);

      const result = await service.buscarMeuPalpitePorJogo('jogo-1', userId);

      expect(result.golsCasa).toBe(2);
      expect(result.golsFora).toBe(1);
    });

    it('deve lançar JogoNaoEncontradoError se jogo inexistente', async () => {
      await expect(
        service.buscarMeuPalpitePorJogo('inexistente', userId),
      ).rejects.toThrow(JogoNaoEncontradoError);
    });

    it('deve retornar null se não tem palpite', async () => {
      const result = await service.buscarMeuPalpitePorJogo('jogo-1', userId);
      expect(result).toBeNull();
    });
  });

  // ==================== buscarMeusPalpitesPorJogos ====================

  describe('buscarMeusPalpitesPorJogos', () => {
    it('deve retornar palpites do usuário para os jogos informados', async () => {
      await service.criar('jogo-1', { golsCasa: 2, golsFora: 1 }, userId);

      const result = await service.buscarMeusPalpitesPorJogos(
        ['jogo-1', 'jogo-2'],
        userId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].jogoId).toBe('jogo-1');
    });

    it('deve retornar lista vazia se não tem palpites', async () => {
      const result = await service.buscarMeusPalpitesPorJogos(
        ['jogo-1'],
        userId,
      );
      expect(result).toHaveLength(0);
    });

    it('deve retornar múltiplos palpites quando existem', async () => {
      await service.criar('jogo-1', { golsCasa: 2, golsFora: 1 }, userId);
      jogoRepo.items.push({
        id: 'jogo-4',
        faseId,
        timeCasaId: 'time-x',
        timeForaId: 'time-y',
        dataHora: new Date('2026-03-16T16:00:00.000Z'),
        status: 'AGENDADO',
      });
      await service.criar('jogo-4', { golsCasa: 0, golsFora: 0 }, userId);

      const result = await service.buscarMeusPalpitesPorJogos(
        ['jogo-1', 'jogo-4'],
        userId,
      );

      expect(result).toHaveLength(2);
    });

    it('não deve retornar palpites de outro usuário', async () => {
      await service.criar('jogo-1', { golsCasa: 2, golsFora: 1 }, outroUserId);

      const result = await service.buscarMeusPalpitesPorJogos(
        ['jogo-1'],
        userId,
      );

      expect(result).toHaveLength(0);
    });
  });

  // ==================== buscarEstatisticasPorJogo ====================

  describe('buscarEstatisticasPorJogo', () => {
    it('deve calcular percentuais corretamente', async () => {
      await palpiteRepo.criar({
        usuarioId: userId,
        jogoId: 'jogo-3',
        golsCasa: 2,
        golsFora: 1,
      });
      await palpiteRepo.criar({
        usuarioId: outroUserId,
        jogoId: 'jogo-3',
        golsCasa: 0,
        golsFora: 1,
      });

      const result = await service.buscarEstatisticasPorJogo('jogo-3', grupoId);

      expect(result.total).toBe(2);
      expect(result.vitoriaCasa).toBe(1);
      expect(result.vitoriaFora).toBe(1);
      expect(result.empate).toBe(0);
      expect(result.percentualCasa).toBe(50);
      expect(result.percentualFora).toBe(50);
      expect(result.percentualEmpate).toBe(0);
    });

    it('deve lançar JogoNaoEncontradoError se jogo inexistente', async () => {
      await expect(
        service.buscarEstatisticasPorJogo('inexistente', grupoId),
      ).rejects.toThrow(JogoNaoEncontradoError);
    });

    it('deve retornar zeros se não há palpites', async () => {
      const result = await service.buscarEstatisticasPorJogo('jogo-3', grupoId);

      expect(result.total).toBe(0);
      expect(result.percentualCasa).toBe(0);
      expect(result.percentualEmpate).toBe(0);
      expect(result.percentualFora).toBe(0);
    });

    it('deve contar empates corretamente', async () => {
      await palpiteRepo.criar({
        usuarioId: userId,
        jogoId: 'jogo-3',
        golsCasa: 1,
        golsFora: 1,
      });
      await palpiteRepo.criar({
        usuarioId: outroUserId,
        jogoId: 'jogo-3',
        golsCasa: 0,
        golsFora: 0,
      });

      const result = await service.buscarEstatisticasPorJogo('jogo-3', grupoId);

      expect(result.total).toBe(2);
      expect(result.empate).toBe(2);
      expect(result.percentualEmpate).toBe(100);
    });

    it('deve lançar JogoNaoPertenceAoGrupoError se jogo de outra temporada', async () => {
      await expect(
        service.buscarEstatisticasPorJogo('jogo-outra-fase', grupoId),
      ).rejects.toThrow(JogoNaoPertenceAoGrupoError);
    });
  });

  // ==================== listarMeusPalpites ====================

  describe('listarMeusPalpites', () => {
    it('deve retornar palpites do usuário', async () => {
      await service.criar('jogo-1', { golsCasa: 2, golsFora: 1 }, userId);

      const result = await service.listarMeusPalpites(userId);

      expect(result).toHaveLength(1);
      expect(result[0].usuarioId).toBe(userId);
    });

    it('deve retornar lista vazia se não tem palpites', async () => {
      const result = await service.listarMeusPalpites(userId);

      expect(result).toHaveLength(0);
    });
  });

  // ==================== listarPorJogoNoGrupo ====================

  describe('listarPorJogoNoGrupo', () => {
    it('jogo FINALIZADO deve retornar palpites de todos os membros', async () => {
      await palpiteRepo.criar({
        usuarioId: userId,
        jogoId: 'jogo-3',
        golsCasa: 2,
        golsFora: 1,
      });
      await palpiteRepo.criar({
        usuarioId: outroUserId,
        jogoId: 'jogo-3',
        golsCasa: 1,
        golsFora: 0,
      });

      const result = await service.listarPorJogoNoGrupo(
        'jogo-3',
        grupoId,
        userId,
      );

      expect(result).toHaveLength(2);
    });

    it('jogo AGENDADO deve retornar apenas palpite do próprio usuário', async () => {
      await palpiteRepo.criar({
        usuarioId: userId,
        jogoId: 'jogo-1',
        golsCasa: 2,
        golsFora: 1,
      });
      await palpiteRepo.criar({
        usuarioId: outroUserId,
        jogoId: 'jogo-1',
        golsCasa: 1,
        golsFora: 0,
      });

      const result = await service.listarPorJogoNoGrupo(
        'jogo-1',
        grupoId,
        userId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].usuarioId).toBe(userId);
    });

    it('jogo AGENDADO sem palpite próprio deve retornar lista vazia', async () => {
      const result = await service.listarPorJogoNoGrupo(
        'jogo-1',
        grupoId,
        userId,
      );

      expect(result).toHaveLength(0);
    });

    it('deve lançar JogoNaoEncontradoError se jogo inexistente', async () => {
      await expect(
        service.listarPorJogoNoGrupo('inexistente', grupoId, userId),
      ).rejects.toThrow(JogoNaoEncontradoError);
    });

    it('deve lançar JogoNaoPertenceAoGrupoError se jogo de outra temporada', async () => {
      await expect(
        service.listarPorJogoNoGrupo('jogo-outra-fase', grupoId, userId),
      ).rejects.toThrow(JogoNaoPertenceAoGrupoError);
    });
  });

  // ==================== criarLote ====================

  describe('criarLote', () => {
    it('deve criar palpites em lote com sucesso', async () => {
      const result = await service.criarLote(
        [{ jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 }],
        userId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].sucesso).toBe(true);
      expect(result[0].palpite).toBeDefined();
    });

    it('deve retornar erro para jogo inexistente no lote', async () => {
      const result = await service.criarLote(
        [{ jogoId: 'inexistente', golsCasa: 1, golsFora: 0 }],
        userId,
      );

      expect(result[0].sucesso).toBe(false);
      expect(result[0].erro).toBeDefined();
    });

    it('deve retornar erro para jogo que não aceita palpites', async () => {
      const result = await service.criarLote(
        [{ jogoId: 'jogo-2', golsCasa: 1, golsFora: 0 }],
        userId,
      );

      expect(result[0].sucesso).toBe(false);
    });

    it('deve retornar erro para palpite duplicado no lote', async () => {
      await service.criar('jogo-1', { golsCasa: 2, golsFora: 1 }, userId);

      const result = await service.criarLote(
        [{ jogoId: 'jogo-1', golsCasa: 3, golsFora: 0 }],
        userId,
      );

      expect(result[0].sucesso).toBe(false);
    });

    it('deve retornar lista vazia para lote vazio', async () => {
      const result = await service.criarLote([], userId);
      expect(result).toHaveLength(0);
    });
  });
});

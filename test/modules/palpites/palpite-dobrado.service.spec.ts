import { describe, it, expect, beforeEach } from 'vitest';
import { PalpiteDobradoService } from '@src/modules/palpites/services/palpite-dobrado.service';
import { TokenDobroService } from '@src/modules/palpites/services/token-dobro.service';
import { InMemoryPalpiteDobradoRepository } from '@src/modules/palpites/repositories/in-memory-palpite-dobrado.repository';
import { InMemoryTokenDobroRepository } from '@src/modules/palpites/repositories/in-memory-token-dobro.repository';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { JogoNaoEncontradoError } from '@src/common/errors/domain-errors/jogos.errors';
import { GrupoNaoEncontradoError } from '@src/common/errors/domain-errors/grupos.errors';
import {
  GrupoNaoPermiteDobroError,
  SemFichasDobroError,
  DobroJaAtivoError,
  DobroNaoEncontradoError,
  JogoNaoAceitaDobroError,
} from '@src/common/errors/domain-errors/palpites.errors';

describe('PalpiteDobradoService', () => {
  let service: PalpiteDobradoService;
  let tokenDobroService: TokenDobroService;
  let palpiteDobradoRepo: InMemoryPalpiteDobradoRepository;
  let tokenDobroRepo: InMemoryTokenDobroRepository;
  let jogoRepo: InMemoryJogoRepository;
  let grupoRepo: any;

  const userId = 'user-1';
  const grupoId = 'grupo-1';
  const jogoId = 'jogo-1';

  const grupoComDobro = {
    id: grupoId,
    nome: 'Bolão',
    permitirPalpiteDobrado: true,
  };

  const grupoSemDobro = {
    id: 'grupo-2',
    nome: 'Bolão 2',
    permitirPalpiteDobrado: false,
  };

  const jogoAgendado = {
    id: jogoId,
    faseId: 'fase-1',
    timeCasaId: 'time-a',
    timeForaId: 'time-b',
    dataHora: new Date('2026-03-15T16:00:00.000Z'),
    status: 'AGENDADO',
  };

  const jogoEmAndamento = {
    id: 'jogo-2',
    faseId: 'fase-1',
    timeCasaId: 'time-c',
    timeForaId: 'time-d',
    dataHora: new Date('2026-03-15T16:00:00.000Z'),
    status: 'EM_ANDAMENTO',
  };

  beforeEach(() => {
    palpiteDobradoRepo = new InMemoryPalpiteDobradoRepository();
    tokenDobroRepo = new InMemoryTokenDobroRepository();
    jogoRepo = new InMemoryJogoRepository();
    jogoRepo.items = [{ ...jogoAgendado }, { ...jogoEmAndamento }];

    grupoRepo = {
      buscarPorId: async (id: string) => {
        if (id === grupoId) return { ...grupoComDobro };
        if (id === 'grupo-2') return { ...grupoSemDobro };
        return null;
      },
      atualizar: async (id: string, data: any) => ({ id, ...data }),
    };

    tokenDobroService = new TokenDobroService(tokenDobroRepo);
    service = new PalpiteDobradoService(
      palpiteDobradoRepo,
      jogoRepo,
      grupoRepo,
      tokenDobroService,
    );
  });

  // ==================== ativarDobro ====================

  describe('ativarDobro', () => {
    it('deve ativar dobro com sucesso', async () => {
      // Conceder 1 token primeiro
      await tokenDobroService.concederToken(
        userId,
        grupoId,
        'ACERTO_EM_CHEIO',
        jogoId,
      );

      const result = await service.ativarDobro(grupoId, jogoId, userId);

      expect(result.usuarioId).toBe(userId);
      expect(result.jogoId).toBe(jogoId);
      expect(result.grupoId).toBe(grupoId);

      const saldo = await tokenDobroService.calcularSaldo(userId, grupoId);
      expect(saldo).toBe(0);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo inexistente', async () => {
      await expect(
        service.ativarDobro('inexistente', jogoId, userId),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });

    it('deve lançar GrupoNaoPermiteDobroError se grupo sem dobro habilitado', async () => {
      await expect(
        service.ativarDobro('grupo-2', jogoId, userId),
      ).rejects.toThrow(GrupoNaoPermiteDobroError);
    });

    it('deve lançar JogoNaoEncontradoError se jogo inexistente', async () => {
      await expect(
        service.ativarDobro(grupoId, 'inexistente', userId),
      ).rejects.toThrow(JogoNaoEncontradoError);
    });

    it('deve lançar JogoNaoAceitaDobroError se jogo não é AGENDADO', async () => {
      await tokenDobroService.concederToken(
        userId,
        grupoId,
        'ACERTO_EM_CHEIO',
        'jogo-2',
      );

      await expect(
        service.ativarDobro(grupoId, 'jogo-2', userId),
      ).rejects.toThrow(JogoNaoAceitaDobroError);
    });

    it('deve lançar DobroJaAtivoError se já existe dobro', async () => {
      await tokenDobroService.concederToken(
        userId,
        grupoId,
        'ACERTO_EM_CHEIO',
        jogoId,
      );
      await tokenDobroService.concederToken(
        userId,
        grupoId,
        'PRIMEIRO_RANKING',
        'fase-1',
      );
      await service.ativarDobro(grupoId, jogoId, userId);

      await expect(
        service.ativarDobro(grupoId, jogoId, userId),
      ).rejects.toThrow(DobroJaAtivoError);
    });

    it('deve lançar SemFichasDobroError se saldo zero', async () => {
      await expect(
        service.ativarDobro(grupoId, jogoId, userId),
      ).rejects.toThrow(SemFichasDobroError);
    });
  });

  // ==================== desativarDobro ====================

  describe('desativarDobro', () => {
    it('deve desativar dobro e devolver ficha', async () => {
      await tokenDobroService.concederToken(
        userId,
        grupoId,
        'ACERTO_EM_CHEIO',
        jogoId,
      );
      await service.ativarDobro(grupoId, jogoId, userId);

      const saldoAntes = await tokenDobroService.calcularSaldo(userId, grupoId);
      expect(saldoAntes).toBe(0);

      await service.desativarDobro(grupoId, jogoId, userId);

      const saldoDepois = await tokenDobroService.calcularSaldo(
        userId,
        grupoId,
      );
      expect(saldoDepois).toBe(1);
    });

    it('deve lançar JogoNaoEncontradoError se jogo inexistente', async () => {
      await expect(
        service.desativarDobro(grupoId, 'inexistente', userId),
      ).rejects.toThrow(JogoNaoEncontradoError);
    });

    it('deve lançar JogoNaoAceitaDobroError se jogo não é AGENDADO', async () => {
      await expect(
        service.desativarDobro(grupoId, 'jogo-2', userId),
      ).rejects.toThrow(JogoNaoAceitaDobroError);
    });

    it('deve lançar DobroNaoEncontradoError se não existe dobro ativo', async () => {
      await expect(
        service.desativarDobro(grupoId, jogoId, userId),
      ).rejects.toThrow(DobroNaoEncontradoError);
    });
  });

  // ==================== atualizarConfiguracaoDobro ====================

  describe('atualizarConfiguracaoDobro', () => {
    it('deve atualizar configuração com sucesso', async () => {
      const result = await service.atualizarConfiguracaoDobro(grupoId, false);

      expect(result.permitirPalpiteDobrado).toBe(false);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo inexistente', async () => {
      await expect(
        service.atualizarConfiguracaoDobro('inexistente', true),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });
  });

  // ==================== listarMeusDobros ====================

  describe('listarMeusDobros', () => {
    it('deve retornar lista vazia quando não há dobros', async () => {
      const result = await service.listarMeusDobros(grupoId, userId);

      expect(result).toEqual([]);
    });

    it('deve retornar dobros do usuário no grupo', async () => {
      await tokenDobroService.concederToken(
        userId,
        grupoId,
        'ACERTO_EM_CHEIO',
        jogoId,
      );
      await tokenDobroService.concederToken(
        userId,
        grupoId,
        'PRIMEIRO_RANKING',
        'fase-1',
      );
      await service.ativarDobro(grupoId, jogoId, userId);

      const result = await service.listarMeusDobros(grupoId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].jogoId).toBe(jogoId);
      expect(result[0].grupoId).toBe(grupoId);
      expect(result[0].usuarioId).toBe(userId);
    });

    it('deve retornar apenas dobros do grupo solicitado', async () => {
      // Ativar dobro no grupo-1
      await tokenDobroService.concederToken(
        userId,
        grupoId,
        'ACERTO_EM_CHEIO',
        jogoId,
      );
      await service.ativarDobro(grupoId, jogoId, userId);

      // Inserir dobro direto no outro grupo (simula outro contexto)
      await palpiteDobradoRepo.criar({
        usuarioId: userId,
        jogoId,
        grupoId: 'grupo-outro',
      });

      const result = await service.listarMeusDobros(grupoId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].grupoId).toBe(grupoId);
    });
  });
});

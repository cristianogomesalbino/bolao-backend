import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { PalpiteService } from '@src/modules/palpites/palpite.service';
import { InMemoryPalpiteRepository } from '@src/modules/palpites/repositories/in-memory-palpite.repository';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import {
  JogoNaoAceitaPalpitesError,
  PalpiteJaExisteError,
  PalpiteNaoPertenceAoUsuarioError,
  PalpiteNaoEncontradoError,
} from '@src/common/errors/domain-errors/palpites.errors';

describe('PalpiteService — Property-Based Tests', () => {
  let service: PalpiteService;
  let palpiteRepo: InMemoryPalpiteRepository;
  let jogoRepo: InMemoryJogoRepository;

  const jogoAgendado = {
    id: 'jogo-agendado',
    faseId: 'fase-1',
    timeCasaId: 'time-a',
    timeForaId: 'time-b',
    dataHora: new Date('2026-06-15T16:00:00Z'),
    status: 'AGENDADO',
  };

  const jogoEmAndamento = {
    id: 'jogo-em-andamento',
    faseId: 'fase-1',
    timeCasaId: 'time-c',
    timeForaId: 'time-d',
    dataHora: new Date('2026-06-15T16:00:00Z'),
    status: 'EM_ANDAMENTO',
  };

  const jogoFinalizado = {
    id: 'jogo-finalizado',
    faseId: 'fase-1',
    timeCasaId: 'time-e',
    timeForaId: 'time-f',
    dataHora: new Date('2026-06-15T16:00:00Z'),
    status: 'FINALIZADO',
    golsCasa: 2,
    golsFora: 1,
  };

  const jogoCancelado = {
    id: 'jogo-cancelado',
    faseId: 'fase-1',
    timeCasaId: 'time-g',
    timeForaId: 'time-h',
    dataHora: new Date('2026-06-15T16:00:00Z'),
    status: 'CANCELADO',
  };

  beforeEach(() => {
    palpiteRepo = new InMemoryPalpiteRepository();
    jogoRepo = new InMemoryJogoRepository();
    jogoRepo.items = [
      { ...jogoAgendado },
      { ...jogoEmAndamento },
      { ...jogoFinalizado },
      { ...jogoCancelado },
    ];
    service = new PalpiteService(palpiteRepo, jogoRepo);
  });

  const arbGols = fc.nat({ max: 20 });

  // Feature: modulo-palpites, Property 1: Round-trip de criação de palpite
  // Valida: Requisitos 1.1, 4.1
  it('Propriedade 1: criar palpite e buscar retorna mesmos dados', async () => {
    await fc.assert(
      fc.asyncProperty(arbGols, arbGols, fc.uuid(), async (golsCasa, golsFora, usuarioId) => {
        palpiteRepo.items = [];

        const criado = await service.criar('jogo-agendado', { golsCasa, golsFora }, usuarioId);
        const encontrado = await service.buscarMeuPalpitePorJogo('jogo-agendado', usuarioId);

        expect(encontrado.golsCasa).toBe(golsCasa);
        expect(encontrado.golsFora).toBe(golsFora);
        expect(encontrado.jogoId).toBe('jogo-agendado');
        expect(encontrado.usuarioId).toBe(usuarioId);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-palpites, Property 2: Rejeição por status do jogo
  // Valida: Requisitos 1.2, 2.2, 3.2
  it('Propriedade 2: operações rejeitadas quando jogo não é AGENDADO', async () => {
    const arbStatusNaoAgendado = fc.constantFrom('jogo-em-andamento', 'jogo-finalizado', 'jogo-cancelado');

    await fc.assert(
      fc.asyncProperty(arbStatusNaoAgendado, arbGols, arbGols, async (jogoId, gc, gf) => {
        palpiteRepo.items = [];

        // Criar deve rejeitar
        await expect(
          service.criar(jogoId, { golsCasa: gc, golsFora: gf }, 'user-1'),
        ).rejects.toThrow(JogoNaoAceitaPalpitesError);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-palpites, Property 3: Unicidade (usuarioId, jogoId)
  // Valida: Requisitos 1.3, 7.1, 7.2
  it('Propriedade 3: segundo palpite para mesmo jogo e usuário rejeita', async () => {
    await fc.assert(
      fc.asyncProperty(arbGols, arbGols, arbGols, arbGols, async (gc1, gf1, gc2, gf2) => {
        palpiteRepo.items = [];

        await service.criar('jogo-agendado', { golsCasa: gc1, golsFora: gf1 }, 'user-1');

        await expect(
          service.criar('jogo-agendado', { golsCasa: gc2, golsFora: gf2 }, 'user-1'),
        ).rejects.toThrow(PalpiteJaExisteError);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-palpites, Property 5: Round-trip de edição
  // Valida: Requisito 2.1
  it('Propriedade 5: editar palpite atualiza dados corretamente', async () => {
    await fc.assert(
      fc.asyncProperty(arbGols, arbGols, arbGols, arbGols, async (gc1, gf1, gc2, gf2) => {
        palpiteRepo.items = [];

        const criado = await service.criar('jogo-agendado', { golsCasa: gc1, golsFora: gf1 }, 'user-1');
        const atualizado = await service.atualizar(criado.id, { golsCasa: gc2, golsFora: gf2 }, 'user-1');

        expect(atualizado.golsCasa).toBe(gc2);
        expect(atualizado.golsFora).toBe(gf2);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-palpites, Property 6: Ownership enforcement
  // Valida: Requisitos 2.3, 3.3
  it('Propriedade 6: outro usuário não pode editar nem excluir palpite', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        arbGols,
        arbGols,
        async (userA, userB, gc, gf) => {
          fc.pre(userA !== userB);
          palpiteRepo.items = [];

          const criado = await service.criar('jogo-agendado', { golsCasa: gc, golsFora: gf }, userA);

          await expect(
            service.atualizar(criado.id, { golsCasa: 0, golsFora: 0 }, userB),
          ).rejects.toThrow(PalpiteNaoPertenceAoUsuarioError);

          await expect(
            service.remover(criado.id, userB),
          ).rejects.toThrow(PalpiteNaoPertenceAoUsuarioError);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-palpites, Property 7: Exclusão permanente
  // Valida: Requisito 3.1
  it('Propriedade 7: após exclusão, palpite não é mais encontrado', async () => {
    await fc.assert(
      fc.asyncProperty(arbGols, arbGols, async (gc, gf) => {
        palpiteRepo.items = [];

        const criado = await service.criar('jogo-agendado', { golsCasa: gc, golsFora: gf }, 'user-1');
        await service.remover(criado.id, 'user-1');

        await expect(
          service.buscarMeuPalpitePorJogo('jogo-agendado', 'user-1'),
        ).rejects.toThrow(PalpiteNaoEncontradoError);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-palpites, Property 8: Visibilidade condicional
  // Valida: Requisitos 5.1, 5.2
  it('Propriedade 8: jogo FINALIZADO mostra todos os palpites, senão só o próprio', async () => {
    await fc.assert(
      fc.asyncProperty(arbGols, arbGols, arbGols, arbGols, async (gc1, gf1, gc2, gf2) => {
        palpiteRepo.items = [];

        // Dois palpites no jogo finalizado
        await palpiteRepo.criar({ usuarioId: 'user-1', jogoId: 'jogo-finalizado', golsCasa: gc1, golsFora: gf1 });
        await palpiteRepo.criar({ usuarioId: 'user-2', jogoId: 'jogo-finalizado', golsCasa: gc2, golsFora: gf2 });

        // Jogo FINALIZADO → todos visíveis
        const todosFinalizado = await service.listarPorJogoNoGrupo(
          'jogo-finalizado', 'grupo-1', 'user-1', ['user-1', 'user-2'],
        );
        expect(todosFinalizado).toHaveLength(2);

        // Dois palpites no jogo agendado
        await palpiteRepo.criar({ usuarioId: 'user-1', jogoId: 'jogo-agendado', golsCasa: gc1, golsFora: gf1 });
        await palpiteRepo.criar({ usuarioId: 'user-2', jogoId: 'jogo-agendado', golsCasa: gc2, golsFora: gf2 });

        // Jogo AGENDADO → só o próprio
        const apenasProprioAgendado = await service.listarPorJogoNoGrupo(
          'jogo-agendado', 'grupo-1', 'user-1', ['user-1', 'user-2'],
        );
        expect(apenasProprioAgendado).toHaveLength(1);
        expect(apenasProprioAgendado[0].usuarioId).toBe('user-1');
      }),
      { numRuns: 100 },
    );
  });
});

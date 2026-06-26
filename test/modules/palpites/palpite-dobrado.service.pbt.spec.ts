import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { PalpiteDobradoService } from '@src/modules/palpites/services/palpite-dobrado.service';
import { TokenDobroService } from '@src/modules/palpites/services/token-dobro.service';
import { InMemoryPalpiteDobradoRepository } from '@src/modules/palpites/repositories/in-memory-palpite-dobrado.repository';
import { InMemoryTokenDobroRepository } from '@src/modules/palpites/repositories/in-memory-token-dobro.repository';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryGrupoRepository } from '@src/modules/grupos/repositories/in-memory-grupo.repository';
import {
  GrupoNaoPermiteDobroError,
  SemFichasDobroError,
  DobroJaAtivoError,
  JogoNaoAceitaDobroError,
} from '@src/common/errors/domain-errors/palpites.errors';

describe('PalpiteDobradoService — Property-Based Tests', () => {
  let service: PalpiteDobradoService;
  let tokenDobroService: TokenDobroService;
  let palpiteDobradoRepo: InMemoryPalpiteDobradoRepository;
  let tokenDobroRepo: InMemoryTokenDobroRepository;
  let jogoRepo: InMemoryJogoRepository;
  let grupoRepo: InMemoryGrupoRepository;

  const userId = 'user-1';
  const grupoId = 'grupo-1';
  const jogoAgendadoId = 'jogo-agendado';

  beforeEach(() => {
    palpiteDobradoRepo = new InMemoryPalpiteDobradoRepository();
    tokenDobroRepo = new InMemoryTokenDobroRepository();
    jogoRepo = new InMemoryJogoRepository();
    grupoRepo = new InMemoryGrupoRepository();

    jogoRepo.items = [
      {
        id: jogoAgendadoId,
        faseId: 'fase-1',
        timeCasaId: 'time-a',
        timeForaId: 'time-b',
        dataHora: new Date('2026-06-15T16:00:00Z'),
        status: 'AGENDADO',
      },
      {
        id: 'jogo-em-andamento',
        faseId: 'fase-1',
        timeCasaId: 'time-c',
        timeForaId: 'time-d',
        dataHora: new Date('2026-06-15T16:00:00Z'),
        status: 'EM_ANDAMENTO',
      },
      {
        id: 'jogo-finalizado',
        faseId: 'fase-1',
        timeCasaId: 'time-e',
        timeForaId: 'time-f',
        dataHora: new Date('2026-06-15T16:00:00Z'),
        status: 'FINALIZADO',
      },
    ];

    grupoRepo.items = [
      {
        id: grupoId,
        nome: 'Grupo Teste',
        temporadaId: 'temp-1',
        privado: false,
        permitirPalpiteDobrado: true,
        ativo: true,
      },
      {
        id: 'grupo-sem-dobro',
        nome: 'Grupo Sem Dobro',
        temporadaId: 'temp-1',
        privado: false,
        permitirPalpiteDobrado: false,
        ativo: true,
      },
    ];

    tokenDobroService = new TokenDobroService(tokenDobroRepo);
    service = new PalpiteDobradoService(
      palpiteDobradoRepo,
      jogoRepo,
      grupoRepo,
      tokenDobroService,
    );
  });

  // Helper: conceder N tokens ao usuário
  async function concederTokens(n: number) {
    for (let i = 0; i < n; i++) {
      await tokenDobroRepo.criar({
        usuarioId: userId,
        grupoId,
        tipo: 'CONCESSAO',
        motivo: 'ACERTO_EM_CHEIO',
        referenciaId: `ref-${i}`,
      });
    }
  }

  // Feature: modulo-palpites, Property 11: Ativação de dobro
  // Valida: Requisito 11.1
  it('Propriedade 11: ativação decrementa saldo e cria registro', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (tokensIniciais) => {
          palpiteDobradoRepo.items = [];
          tokenDobroRepo.items = [];
          await concederTokens(tokensIniciais);

          const saldoAntes = await tokenDobroService.calcularSaldo(
            userId,
            grupoId,
          );
          await service.ativarDobro(grupoId, jogoAgendadoId, userId);
          const saldoDepois = await tokenDobroService.calcularSaldo(
            userId,
            grupoId,
          );

          expect(saldoDepois).toBe(saldoAntes - 1);

          const dobro = await palpiteDobradoRepo.buscarPorChave(
            userId,
            jogoAgendadoId,
            grupoId,
          );
          expect(dobro).not.toBeNull();
        },
      ),
      { numRuns: 50 },
    );
  });

  // Feature: modulo-palpites, Property 12: Desativação de dobro
  // Valida: Requisito 12.1
  it('Propriedade 12: desativação incrementa saldo e remove registro', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (tokensIniciais) => {
          palpiteDobradoRepo.items = [];
          tokenDobroRepo.items = [];
          await concederTokens(tokensIniciais);

          await service.ativarDobro(grupoId, jogoAgendadoId, userId);
          const saldoAposAtivar = await tokenDobroService.calcularSaldo(
            userId,
            grupoId,
          );

          await service.desativarDobro(grupoId, jogoAgendadoId, userId);
          const saldoAposDesativar = await tokenDobroService.calcularSaldo(
            userId,
            grupoId,
          );

          expect(saldoAposDesativar).toBe(saldoAposAtivar + 1);

          const dobro = await palpiteDobradoRepo.buscarPorChave(
            userId,
            jogoAgendadoId,
            grupoId,
          );
          expect(dobro).toBeNull();
        },
      ),
      { numRuns: 50 },
    );
  });

  // Feature: modulo-palpites, Property 13: Round-trip de saldo
  // Valida: Requisitos 11.1, 12.1
  it('Propriedade 13: ativar e desativar preserva saldo original', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (tokensIniciais) => {
          palpiteDobradoRepo.items = [];
          tokenDobroRepo.items = [];
          await concederTokens(tokensIniciais);

          const saldoOriginal = await tokenDobroService.calcularSaldo(
            userId,
            grupoId,
          );

          await service.ativarDobro(grupoId, jogoAgendadoId, userId);
          await service.desativarDobro(grupoId, jogoAgendadoId, userId);

          const saldoFinal = await tokenDobroService.calcularSaldo(
            userId,
            grupoId,
          );
          expect(saldoFinal).toBe(saldoOriginal);
        },
      ),
      { numRuns: 50 },
    );
  });

  // Feature: modulo-palpites, Property 14: Rejeição por status do jogo
  // Valida: Requisitos 11.2, 12.2
  it('Propriedade 14: ativar dobro em jogo não AGENDADO rejeita', async () => {
    const arbJogoNaoAgendado = fc.constantFrom(
      'jogo-em-andamento',
      'jogo-finalizado',
    );

    await fc.assert(
      fc.asyncProperty(arbJogoNaoAgendado, async (jogoId) => {
        palpiteDobradoRepo.items = [];
        tokenDobroRepo.items = [];
        await concederTokens(3);

        await expect(
          service.ativarDobro(grupoId, jogoId, userId),
        ).rejects.toThrow(JogoNaoAceitaDobroError);
      }),
      { numRuns: 50 },
    );
  });

  // Feature: modulo-palpites, Property 15: Saldo insuficiente
  // Valida: Requisito 11.3
  it('Propriedade 15: saldo zero rejeita ativação de dobro', async () => {
    // Sem conceder tokens → saldo = 0
    await expect(
      service.ativarDobro(grupoId, jogoAgendadoId, userId),
    ).rejects.toThrow(SemFichasDobroError);
  });

  // Feature: modulo-palpites, Property 16: Unicidade (usuarioId, jogoId, grupoId)
  // Valida: Requisitos 11.4, 15.1, 15.2
  it('Propriedade 16: dobro duplicado rejeita com DobroJaAtivoError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        async (tokensIniciais) => {
          palpiteDobradoRepo.items = [];
          tokenDobroRepo.items = [];
          await concederTokens(tokensIniciais);

          await service.ativarDobro(grupoId, jogoAgendadoId, userId);

          await expect(
            service.ativarDobro(grupoId, jogoAgendadoId, userId),
          ).rejects.toThrow(DobroJaAtivoError);
        },
      ),
      { numRuns: 50 },
    );
  });

  // Feature: modulo-palpites, Property 17: Grupo sem dobro
  // Valida: Requisitos 11.5, 10.7
  it('Propriedade 17: grupo sem dobro habilitado rejeita ativação', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (tokensIniciais) => {
          palpiteDobradoRepo.items = [];
          tokenDobroRepo.items = [];

          // Conceder tokens no grupo sem dobro
          for (let i = 0; i < tokensIniciais; i++) {
            await tokenDobroRepo.criar({
              usuarioId: userId,
              grupoId: 'grupo-sem-dobro',
              tipo: 'CONCESSAO',
              motivo: 'ACERTO_EM_CHEIO',
              referenciaId: `ref-${i}`,
            });
          }

          await expect(
            service.ativarDobro('grupo-sem-dobro', jogoAgendadoId, userId),
          ).rejects.toThrow(GrupoNaoPermiteDobroError);
        },
      ),
      { numRuns: 50 },
    );
  });

  // Feature: modulo-palpites, Property 21: Cálculo de saldo
  // Valida: Requisitos 13.1, 10.6
  it('Propriedade 21: saldo é diferença entre concessões e utilizações', async () => {
    const arbSequencia = fc.array(
      fc.constantFrom('CONCESSAO' as const, 'UTILIZACAO' as const),
      { minLength: 1, maxLength: 20 },
    );

    await fc.assert(
      fc.asyncProperty(arbSequencia, async (sequencia) => {
        tokenDobroRepo.items = [];

        for (let i = 0; i < sequencia.length; i++) {
          await tokenDobroRepo.criar({
            usuarioId: userId,
            grupoId,
            tipo: sequencia[i],
            motivo:
              sequencia[i] === 'CONCESSAO'
                ? 'ACERTO_EM_CHEIO'
                : 'ATIVACAO_DOBRO',
            referenciaId: `ref-${i}`,
          });
        }

        const saldo = await tokenDobroService.calcularSaldo(userId, grupoId);
        const concessoes = sequencia.filter((t) => t === 'CONCESSAO').length;
        const utilizacoes = sequencia.filter((t) => t === 'UTILIZACAO').length;

        expect(saldo).toBe(concessoes - utilizacoes);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-palpites, Property 22: Dados completos do token
  // Valida: Requisito 10.5
  it('Propriedade 22: registro de token contém dados completos', async () => {
    const arbMotivo = fc.constantFrom(
      'PALPITES_COMPLETOS' as const,
      'ACERTO_EM_CHEIO' as const,
      'ULTIMO_RANKING' as const,
      'PRIMEIRO_RANKING' as const,
    );

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        arbMotivo,
        fc.uuid(),
        async (uid, gid, motivo, refId) => {
          tokenDobroRepo.items = [];

          const token = await tokenDobroService.concederToken(
            uid,
            gid,
            motivo,
            refId,
          );

          expect(token.usuarioId).toBe(uid);
          expect(token.grupoId).toBe(gid);
          expect(token.tipo).toBe('CONCESSAO');
          expect(token.motivo).toBe(motivo);
          expect(token.referenciaId).toBe(refId);
          expect(token.dataCriacao).toBeDefined();
          expect(token.id).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-palpites, Property 24: Desabilitar preserva tokens
  // Valida: Requisito 9.4
  it('Propriedade 24: desabilitar dobro preserva tokens mas impede ativações', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (tokensIniciais) => {
          palpiteDobradoRepo.items = [];
          tokenDobroRepo.items = [];
          await concederTokens(tokensIniciais);

          const saldoAntes = await tokenDobroService.calcularSaldo(
            userId,
            grupoId,
          );

          // Desabilitar dobro no grupo
          await service.atualizarConfiguracaoDobro(grupoId, false);

          // Saldo preservado
          const saldoDepois = await tokenDobroService.calcularSaldo(
            userId,
            grupoId,
          );
          expect(saldoDepois).toBe(saldoAntes);

          // Ativação bloqueada
          await expect(
            service.ativarDobro(grupoId, jogoAgendadoId, userId),
          ).rejects.toThrow(GrupoNaoPermiteDobroError);

          // Reabilitar pra não afetar outros testes
          await service.atualizarConfiguracaoDobro(grupoId, true);
        },
      ),
      { numRuns: 50 },
    );
  });
});

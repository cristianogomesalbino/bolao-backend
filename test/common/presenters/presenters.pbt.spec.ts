import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PalpitePresenter } from '@src/common/presenters/palpite.presenter';
import { PalpiteDobradoPresenter } from '@src/common/presenters/palpite-dobrado.presenter';
import { TokenDobroPresenter } from '@src/common/presenters/token-dobro.presenter';
import { FasePresenter } from '@src/common/presenters/fase.presenter';
import { JogoPresenter } from '@src/common/presenters/jogo.presenter';

describe('Presenters — Property-Based Tests', () => {
  // Helper: gera objeto com campos extras aleatórios
  const arbExtras = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-z]/.test(s)),
    fc.anything(),
  );

  // Feature: modulo-palpites, Property 10: Allowlist dos presenters
  // Valida: Requisitos 8.1, 8.2, 16.1, 16.2, 16.3
  it('PalpitePresenter.toHttp retorna apenas campos da allowlist', () => {
    const allowlist = ['id', 'golsCasa', 'golsFora', 'jogoId', 'usuarioId', 'dataCriacao'];

    fc.assert(
      fc.property(arbExtras, (extras) => {
        const input = {
          id: 'palpite-1',
          golsCasa: 2,
          golsFora: 1,
          jogoId: 'jogo-1',
          usuarioId: 'user-1',
          dataCriacao: new Date(),
          // Campos extras que NÃO devem aparecer
          senha: 'secret',
          atualizadoEm: new Date(),
          ...extras,
        };

        const result = PalpitePresenter.toHttp(input);
        const keys = Object.keys(result);

        expect(keys.sort()).toEqual(allowlist.sort());
      }),
      { numRuns: 100 },
    );
  });

  it('PalpiteDobradoPresenter.toHttp retorna apenas campos da allowlist', () => {
    const allowlist = ['id', 'usuarioId', 'jogoId', 'grupoId', 'dataCriacao'];

    fc.assert(
      fc.property(arbExtras, (extras) => {
        const input = {
          id: 'dobro-1',
          usuarioId: 'user-1',
          jogoId: 'jogo-1',
          grupoId: 'grupo-1',
          dataCriacao: new Date(),
          campoSecreto: 'nao-deve-aparecer',
          ...extras,
        };

        const result = PalpiteDobradoPresenter.toHttp(input);
        const keys = Object.keys(result);

        expect(keys.sort()).toEqual(allowlist.sort());
      }),
      { numRuns: 100 },
    );
  });

  it('TokenDobroPresenter.toHttp retorna apenas campos da allowlist', () => {
    const allowlist = ['id', 'usuarioId', 'grupoId', 'motivo', 'referenciaId', 'tipo', 'dataCriacao'];

    fc.assert(
      fc.property(arbExtras, (extras) => {
        const input = {
          id: 'token-1',
          usuarioId: 'user-1',
          grupoId: 'grupo-1',
          motivo: 'ACERTO_EM_CHEIO',
          referenciaId: 'jogo-1',
          tipo: 'CONCESSAO',
          dataCriacao: new Date(),
          campoExtra: 'nao-deve-aparecer',
          ...extras,
        };

        const result = TokenDobroPresenter.toHttp(input);
        const keys = Object.keys(result);

        expect(keys.sort()).toEqual(allowlist.sort());
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-jogos, Property 21: Presenter expõe apenas campos permitidos (allowlist)
  // Valida: Requisitos 8.3, 8.4, 14.4
  it('FasePresenter.toHttp retorna apenas campos da allowlist', () => {
    const allowlist = ['id', 'nome', 'tipo', 'ordem', 'idaVolta', 'temporadaId', 'dataCriacao'];

    fc.assert(
      fc.property(arbExtras, (extras) => {
        const input = {
          id: 'fase-1',
          nome: 'Rodada 1',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: false,
          temporadaId: 'temp-1',
          dataCriacao: new Date(),
          campoSecreto: 'nao-deve-aparecer',
          ...extras,
        };

        const result = FasePresenter.toHttp(input);
        const keys = Object.keys(result);

        expect(keys.sort()).toEqual(allowlist.sort());
      }),
      { numRuns: 100 },
    );
  });

  it('JogoPresenter.toHttp retorna apenas campos da allowlist', () => {
    const allowlist = [
      'id', 'faseId', 'timeCasaId', 'timeForaId', 'dataHora', 'status',
      'golsCasa', 'golsFora', 'temProrrogacao', 'golsProrrogacaoCasa', 'golsProrrogacaoFora',
      'temPenaltis', 'penaltisCasa', 'penaltisFora', 'vencedorId',
      'ehJogoVolta', 'grupoIdaVolta', 'fonteResultado', 'externoId', 'criadoPor',
      'dataCriacao', 'atualizadoEm',
    ];

    fc.assert(
      fc.property(arbExtras, (extras) => {
        const input = {
          id: 'jogo-1',
          faseId: 'fase-1',
          timeCasaId: 'time-a',
          timeForaId: 'time-b',
          dataHora: new Date(),
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
          fonteResultado: 'MANUAL',
          externoId: null,
          criadoPor: 'user-1',
          dataCriacao: new Date(),
          atualizadoEm: new Date(),
          campoSecreto: 'nao-deve-aparecer',
          ...extras,
        };

        const result = JogoPresenter.toHttp(input);
        const keys = Object.keys(result);

        expect(keys.sort()).toEqual(allowlist.sort());
      }),
      { numRuns: 100 },
    );
  });
});

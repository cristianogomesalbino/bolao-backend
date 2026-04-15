import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { FaseService } from '@src/modules/jogos/fase.service';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryTemporadaRepository } from '@src/modules/temporadas/repositories/in-memory-temporada.repository';
import { IdaVoltaNaoPermitidaError } from '@src/common/errors/domain-errors';

describe('FaseService — Property-Based Tests', () => {
  let service: FaseService;
  let faseRepo: InMemoryFaseRepository;
  let temporadaRepo: InMemoryTemporadaRepository;

  const temporadaId = 'temp-1';

  beforeEach(() => {
    faseRepo = new InMemoryFaseRepository();
    temporadaRepo = new InMemoryTemporadaRepository();
    temporadaRepo.items = [
      { id: temporadaId, ano: 2026, campeonatoId: 'camp-1', dataCriacao: new Date() },
    ];
    service = new FaseService(faseRepo, temporadaRepo);
  });

  // Feature: modulo-jogos, Property 1: Round-trip de criação de Fase
  // Valida: Requisitos 1.1, 1.4
  it('Propriedade 1: criar fase e buscar por ID retorna mesmos dados', async () => {
    const arbTipo = fc.constantFrom('PONTOS_CORRIDOS' as const, 'MATA_MATA' as const);
    const arbNome = fc.string({ minLength: 1, maxLength: 50 });
    const arbOrdem = fc.integer({ min: 1, max: 100 });

    await fc.assert(
      fc.asyncProperty(arbNome, arbTipo, arbOrdem, async (nome, tipo, ordem) => {
        faseRepo.items = [];

        const criada = await service.criar({
          temporadaId,
          nome,
          tipo,
          ordem,
          idaVolta: false,
        });

        const encontrada = await service.buscarPorId(criada.id);

        expect(encontrada.nome).toBe(nome);
        expect(encontrada.tipo).toBe(tipo);
        expect(encontrada.ordem).toBe(ordem);
        expect(encontrada.idaVolta).toBe(false);
        expect(encontrada.temporadaId).toBe(temporadaId);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-jogos, Property 2: Listagem de fases ordenada por ordem
  // Valida: Requisito 1.3
  it('Propriedade 2: listagem de fases sempre ordenada por campo ordem', async () => {
    const arbOrdens = fc.uniqueArray(fc.integer({ min: 1, max: 1000 }), {
      minLength: 2,
      maxLength: 10,
    });

    await fc.assert(
      fc.asyncProperty(arbOrdens, async (ordens) => {
        faseRepo.items = [];

        // Criar fases em ordem aleatória
        const ordensEmbaralhadas = [...ordens].sort(() => Math.random() - 0.5);
        for (const ordem of ordensEmbaralhadas) {
          await service.criar({
            temporadaId,
            nome: `Fase ${ordem}`,
            tipo: 'PONTOS_CORRIDOS',
            ordem,
          });
        }

        const resultado = await service.listar(temporadaId);

        expect(resultado).toHaveLength(ordens.length);
        for (let i = 1; i < resultado.length; i++) {
          expect(resultado[i].ordem).toBeGreaterThan(resultado[i - 1].ordem);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: modulo-jogos, Property 3: Restrição idaVolta apenas em MATA_MATA
  // Valida: Requisito 1.6
  it('Propriedade 3: idaVolta true com PONTOS_CORRIDOS sempre rejeita', async () => {
    const arbNome = fc.string({ minLength: 1, maxLength: 50 });
    const arbOrdem = fc.integer({ min: 1, max: 100 });

    await fc.assert(
      fc.asyncProperty(arbNome, arbOrdem, async (nome, ordem) => {
        faseRepo.items = [];

        await expect(
          service.criar({
            temporadaId,
            nome,
            tipo: 'PONTOS_CORRIDOS',
            ordem,
            idaVolta: true,
          }),
        ).rejects.toThrow(IdaVoltaNaoPermitidaError);

        // MATA_MATA com idaVolta true deve funcionar
        const fase = await service.criar({
          temporadaId,
          nome,
          tipo: 'MATA_MATA',
          ordem,
          idaVolta: true,
        });
        expect(fase.idaVolta).toBe(true);
        expect(fase.tipo).toBe('MATA_MATA');
      }),
      { numRuns: 100 },
    );
  });
});

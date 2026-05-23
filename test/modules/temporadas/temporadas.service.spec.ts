import { describe, it, expect, beforeEach } from 'vitest';
import {
  CampeonatoNaoEncontradoError,
  TemporadaOrigemNaoEncontradaError,
} from '@src/common/errors/domain-errors';
import { TemporadasService } from '@src/modules/temporadas/temporadas.service';
import { InMemoryTemporadaRepository } from '@src/modules/temporadas/repositories/in-memory-temporada.repository';
import { InMemoryCampeonatoRepository } from '@src/modules/campeonatos/repositories/in-memory-campeonato.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';

describe('TemporadasService', () => {
  let service: TemporadasService;
  let temporadaRepo: InMemoryTemporadaRepository;
  let campeonatoRepo: InMemoryCampeonatoRepository;
  let faseRepo: InMemoryFaseRepository;

  beforeEach(() => {
    temporadaRepo = new InMemoryTemporadaRepository();
    campeonatoRepo = new InMemoryCampeonatoRepository();
    faseRepo = new InMemoryFaseRepository();
    service = new TemporadasService(temporadaRepo, campeonatoRepo, faseRepo);
  });

  describe('criar', () => {
    it('deve criar uma temporada quando campeonato existe', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });

      const result = await service.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
      });

      expect(result.ano).toBe(2026);
      expect(result.campeonatoId).toBe(campeonato.id);
      expect(result.id).toBeDefined();
      expect(temporadaRepo.items).toHaveLength(1);
    });

    it('deve lançar CampeonatoNaoEncontradoError se campeonato não existe', async () => {
      await expect(
        service.criar({ ano: 2026, campeonatoId: 'inexistente' }),
      ).rejects.toThrow(CampeonatoNaoEncontradoError);
    });

    it('deve copiar fases da temporada de origem', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });
      const temporadaOrigem = await temporadaRepo.criar({
        ano: 2025,
        campeonatoId: campeonato.id,
      });

      await faseRepo.criar({
        nome: 'Fase de Grupos',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
        idaVolta: false,
        temporadaId: temporadaOrigem.id,
      });
      await faseRepo.criar({
        nome: 'Mata-Mata',
        tipo: 'MATA_MATA',
        ordem: 2,
        idaVolta: true,
        temporadaId: temporadaOrigem.id,
      });

      const result = await service.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
        copiarFasesDe: temporadaOrigem.id,
      });

      const fasesNovas = await faseRepo.buscarPorTemporada(result.id);
      expect(fasesNovas).toHaveLength(2);
      expect(fasesNovas[0].nome).toBe('Fase de Grupos');
      expect(fasesNovas[0].tipo).toBe('PONTOS_CORRIDOS');
      expect(fasesNovas[0].ordem).toBe(1);
      expect(fasesNovas[0].idaVolta).toBe(false);
      expect(fasesNovas[0].temporadaId).toBe(result.id);
      expect(fasesNovas[1].nome).toBe('Mata-Mata');
      expect(fasesNovas[1].tipo).toBe('MATA_MATA');
      expect(fasesNovas[1].ordem).toBe(2);
      expect(fasesNovas[1].idaVolta).toBe(true);
      expect(fasesNovas[1].temporadaId).toBe(result.id);
    });

    it('deve lançar TemporadaOrigemNaoEncontradaError se temporada de origem não existe', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });

      await expect(
        service.criar({
          ano: 2026,
          campeonatoId: campeonato.id,
          copiarFasesDe: 'id-inexistente',
        }),
      ).rejects.toThrow(TemporadaOrigemNaoEncontradaError);
    });

    it('deve criar temporada sem fases quando copiarFasesDe não é informado', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });

      const result = await service.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
      });

      const fases = await faseRepo.buscarPorTemporada(result.id);
      expect(fases).toHaveLength(0);
    });

    it('deve criar temporada sem fases quando temporada de origem não tem fases', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });
      const temporadaOrigem = await temporadaRepo.criar({
        ano: 2025,
        campeonatoId: campeonato.id,
      });

      const result = await service.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
        copiarFasesDe: temporadaOrigem.id,
      });

      const fases = await faseRepo.buscarPorTemporada(result.id);
      expect(fases).toHaveLength(0);
    });
  });

  describe('buscarTodos', () => {
    it('deve retornar temporadas com campeonato incluso', async () => {
      const campeonato = await campeonatoRepo.criar({ nome: 'Brasileirão' });
      temporadaRepo.campeonatos = campeonatoRepo.items;
      await service.criar({ ano: 2026, campeonatoId: campeonato.id });

      const result = await service.buscarTodos();

      expect(result).toHaveLength(1);
      expect(result[0].campeonato.nome).toBe('Brasileirão');
    });
  });
});

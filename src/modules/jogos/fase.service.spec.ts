import { describe, it, expect, beforeEach } from 'vitest';
import { FaseService } from './fase.service';
import { InMemoryFaseRepository } from './repositories/in-memory-fase.repository';
import { InMemoryTemporadaRepository } from '../temporadas/repositories/in-memory-temporada.repository';
import {
  TemporadaNaoEncontradaError,
  FaseNaoEncontradaError,
  IdaVoltaNaoPermitidaError,
} from '../../common/errors/domain-errors';

describe('FaseService', () => {
  let service: FaseService;
  let faseRepo: InMemoryFaseRepository;
  let temporadaRepo: InMemoryTemporadaRepository;

  const temporada = {
    id: 'temp-1',
    ano: 2026,
    campeonatoId: 'camp-1',
    dataCriacao: new Date(),
  };

  beforeEach(() => {
    faseRepo = new InMemoryFaseRepository();
    temporadaRepo = new InMemoryTemporadaRepository();
    temporadaRepo.items = [{ ...temporada }];
    service = new FaseService(faseRepo, temporadaRepo);
  });

  // ==================== criar ====================

  describe('criar', () => {
    it('deve criar fase com temporadaId válido', async () => {
      const result = await service.criar({
        temporadaId: 'temp-1',
        nome: 'Rodada 1',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
      });

      expect(result.nome).toBe('Rodada 1');
      expect(result.tipo).toBe('PONTOS_CORRIDOS');
      expect(result.ordem).toBe(1);
      expect(result.idaVolta).toBe(false);
      expect(result.temporadaId).toBe('temp-1');
      expect(result.id).toBeDefined();
      expect(faseRepo.items).toHaveLength(1);
    });

    it('deve lançar TemporadaNaoEncontradaError se temporadaId inexistente', async () => {
      await expect(
        service.criar({
          temporadaId: 'inexistente',
          nome: 'Rodada 1',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
        }),
      ).rejects.toThrow(TemporadaNaoEncontradaError);
    });

    it('deve lançar IdaVoltaNaoPermitidaError se idaVolta true e tipo PONTOS_CORRIDOS', async () => {
      await expect(
        service.criar({
          temporadaId: 'temp-1',
          nome: 'Rodada 1',
          tipo: 'PONTOS_CORRIDOS',
          ordem: 1,
          idaVolta: true,
        }),
      ).rejects.toThrow(IdaVoltaNaoPermitidaError);
    });

    it('deve criar fase MATA_MATA com idaVolta true', async () => {
      const result = await service.criar({
        temporadaId: 'temp-1',
        nome: 'Quartas',
        tipo: 'MATA_MATA',
        ordem: 1,
        idaVolta: true,
      });

      expect(result.tipo).toBe('MATA_MATA');
      expect(result.idaVolta).toBe(true);
    });
  });

  // ==================== listar ====================

  describe('listar', () => {
    it('deve listar fases ordenadas por ordem', async () => {
      await service.criar({
        temporadaId: 'temp-1',
        nome: 'Fase 2',
        tipo: 'MATA_MATA',
        ordem: 2,
      });
      await service.criar({
        temporadaId: 'temp-1',
        nome: 'Fase 1',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
      });

      const result = await service.listar('temp-1');

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Fase 1');
      expect(result[1].nome).toBe('Fase 2');
    });
  });

  // ==================== buscarPorId ====================

  describe('buscarPorId', () => {
    it('deve retornar fase existente', async () => {
      const created = await service.criar({
        temporadaId: 'temp-1',
        nome: 'Rodada 1',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
      });

      const result = await service.buscarPorId(created.id);

      expect(result.id).toBe(created.id);
      expect(result.nome).toBe('Rodada 1');
    });

    it('deve lançar FaseNaoEncontradaError se fase inexistente', async () => {
      await expect(service.buscarPorId('inexistente')).rejects.toThrow(
        FaseNaoEncontradaError,
      );
    });
  });
});

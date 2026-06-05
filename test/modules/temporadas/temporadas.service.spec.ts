import { describe, it, expect, beforeEach } from 'vitest';
import {
  CampeonatoNaoEncontradoError,
  TemporadaOrigemNaoEncontradaError,
  TemporadaNaoEncontradaError,
} from '@src/common/errors/domain-errors';
import { TemporadasService } from '@src/modules/temporadas/temporadas.service';
import { InMemoryTemporadaRepository } from '@src/modules/temporadas/repositories/in-memory-temporada.repository';
import { InMemoryCampeonatoRepository } from '@src/modules/campeonatos/repositories/in-memory-campeonato.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';

interface Campeonato {
  id: string;
  nome: string;
}
interface Fase {
  id: string;
  nome: string;
  tipo: string;
  ordem: number;
  idaVolta: boolean;
  temporadaId: string;
}

describe('TemporadasService', () => {
  let service: TemporadasService;
  let temporadaRepo: InMemoryTemporadaRepository;
  let campeonatoRepo: InMemoryCampeonatoRepository;
  let faseRepo: InMemoryFaseRepository;
  let jogoRepo: InMemoryJogoRepository;

  beforeEach(() => {
    temporadaRepo = new InMemoryTemporadaRepository();
    campeonatoRepo = new InMemoryCampeonatoRepository();
    faseRepo = new InMemoryFaseRepository();
    jogoRepo = new InMemoryJogoRepository();
    service = new TemporadasService(
      temporadaRepo,
      campeonatoRepo,
      faseRepo,
      jogoRepo,
    );
  });

  describe('criar', () => {
    it('deve criar uma temporada quando campeonato existe', async () => {
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;

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
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;
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

      const fasesNovas = (await faseRepo.buscarPorTemporada(
        result.id,
      )) as Fase[];
      expect(fasesNovas).toHaveLength(2);
      expect(fasesNovas[0].nome).toBe('Fase de Grupos');
      expect(fasesNovas[0].temporadaId).toBe(result.id);
      expect(fasesNovas[1].nome).toBe('Mata-Mata');
    });

    it('deve lançar TemporadaOrigemNaoEncontradaError se temporada de origem não existe', async () => {
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;

      await expect(
        service.criar({
          ano: 2026,
          campeonatoId: campeonato.id,
          copiarFasesDe: 'id-inexistente',
        }),
      ).rejects.toThrow(TemporadaOrigemNaoEncontradaError);
    });

    it('deve criar temporada sem fases quando copiarFasesDe não é informado', async () => {
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;

      const result = await service.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
      });

      const fases = await faseRepo.buscarPorTemporada(result.id);
      expect(fases).toHaveLength(0);
    });

    it('deve criar temporada sem fases quando temporada de origem não tem fases', async () => {
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;
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
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;
      temporadaRepo.campeonatos = campeonatoRepo.items;
      await service.criar({ ano: 2026, campeonatoId: campeonato.id });

      const result = await service.buscarTodos();

      expect(result).toHaveLength(1);
      expect(result[0].campeonato?.nome).toBe('Brasileirão');
    });
  });

  describe('buscarDadosTemporada', () => {
    it('deve retornar próximo jogo e total de adiados', async () => {
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;
      const temporada = await temporadaRepo.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
      });

      const fase = (await faseRepo.criar({
        nome: 'Fase Única',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
        idaVolta: false,
        temporadaId: temporada.id,
      })) as Fase;

      jogoRepo.items.push(
        {
          id: 'jogo-1',
          faseId: fase.id,
          status: 'AGENDADO',
          dataHora: new Date('2030-06-15T16:00:00Z'),
          fase: { temporadaId: temporada.id },
        },
        {
          id: 'jogo-2',
          faseId: fase.id,
          status: 'ADIADO',
          dataHora: null,
          fase: { temporadaId: temporada.id },
        },
      );

      const result = await service.buscarDadosTemporada(temporada.id);

      expect(result.proximoJogo).not.toBeNull();
      expect((result.proximoJogo as { id: string }).id).toBe('jogo-1');
      expect(result.totalAdiados).toBe(1);
    });

    it('deve lançar TemporadaNaoEncontradaError para temporadaId inexistente', async () => {
      await expect(service.buscarDadosTemporada('inexistente')).rejects.toThrow(
        TemporadaNaoEncontradaError,
      );
    });

    it('deve retornar proximoJogo null se não há jogos agendados', async () => {
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;
      const temporada = await temporadaRepo.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
      });

      const result = await service.buscarDadosTemporada(temporada.id);

      expect(result.proximoJogo).toBeNull();
      expect(result.totalAdiados).toBe(0);
    });
  });

  describe('buscarJogosTemporada', () => {
    it('deve retornar todos os jogos da temporada', async () => {
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;
      const temporada = await temporadaRepo.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
      });

      const fase = (await faseRepo.criar({
        nome: 'Fase Única',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
        idaVolta: false,
        temporadaId: temporada.id,
      })) as Fase;

      jogoRepo.items.push(
        {
          id: 'jogo-1',
          faseId: fase.id,
          status: 'AGENDADO',
          fase: { temporadaId: temporada.id },
        },
        {
          id: 'jogo-2',
          faseId: fase.id,
          status: 'FINALIZADO',
          fase: { temporadaId: temporada.id },
        },
      );

      const result = await service.buscarJogosTemporada(temporada.id);

      expect(result).toHaveLength(2);
    });

    it('deve lançar TemporadaNaoEncontradaError para temporadaId inexistente', async () => {
      await expect(service.buscarJogosTemporada('inexistente')).rejects.toThrow(
        TemporadaNaoEncontradaError,
      );
    });

    it('deve retornar lista vazia se temporada não tem jogos', async () => {
      const campeonato = (await campeonatoRepo.criar({
        nome: 'Brasileirão',
      })) as Campeonato;
      const temporada = await temporadaRepo.criar({
        ano: 2026,
        campeonatoId: campeonato.id,
      });

      const result = await service.buscarJogosTemporada(temporada.id);

      expect(result).toHaveLength(0);
    });
  });
});

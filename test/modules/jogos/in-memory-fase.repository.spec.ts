import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';

describe('InMemoryFaseRepository', () => {
  let repo: InMemoryFaseRepository;

  beforeEach(() => {
    repo = new InMemoryFaseRepository();
  });

  describe('buscarPorCampeonatoENome', () => {
    beforeEach(async () => {
      await repo.criar({
        nome: 'Final',
        tipo: 'MATA_MATA',
        ordem: 7,
        temporadaId: 'temp-1',
      });
      await repo.criar({
        nome: 'Oitavas de Final',
        tipo: 'MATA_MATA',
        ordem: 3,
        temporadaId: 'temp-1',
      });
      await repo.criar({
        nome: 'Disputa 3º Lugar',
        tipo: 'MATA_MATA',
        ordem: 6,
        temporadaId: 'temp-1',
      });
    });

    it('deve buscar por contains quando não tem prefixo EXACT', async () => {
      const resultado = await repo.buscarPorCampeonatoENome('Copa', 'Final');
      expect(resultado).not.toBeNull();
      // contains: "Final" pode retornar "Final" ou "Oitavas de Final"
      expect(resultado?.id).toBeDefined();
    });

    it('deve buscar por igualdade exata com prefixo EXACT:', async () => {
      const resultado = await repo.buscarPorCampeonatoENome(
        'Copa',
        'EXACT:Final',
      );
      expect(resultado).not.toBeNull();
      // Deve retornar apenas a fase com nome exato "Final"
      const fase = repo.items.find((f) => f.id === resultado?.id);
      expect(fase?.nome).toBe('Final');
    });

    it('EXACT: não deve retornar match parcial', async () => {
      const resultado = await repo.buscarPorCampeonatoENome(
        'Copa',
        'EXACT:Oitavas',
      );
      // "Oitavas" não é nome exato de nenhuma fase (é "Oitavas de Final")
      expect(resultado).toBeNull();
    });

    it('deve retornar primeiro item quando nomeFase é vazio', async () => {
      const resultado = await repo.buscarPorCampeonatoENome('Copa', '');
      expect(resultado).not.toBeNull();
    });

    it('deve retornar null se nenhuma fase encontrada', async () => {
      const resultado = await repo.buscarPorCampeonatoENome(
        'Copa',
        'EXACT:Inexistente',
      );
      expect(resultado).toBeNull();
    });

    it('contains deve encontrar 3º Lugar em Disputa 3º Lugar', async () => {
      const resultado = await repo.buscarPorCampeonatoENome('Copa', '3º Lugar');
      expect(resultado).not.toBeNull();
      const fase = repo.items.find((f) => f.id === resultado?.id);
      expect(fase?.nome).toBe('Disputa 3º Lugar');
    });
  });
});

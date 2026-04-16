import { describe, it, expect, beforeEach } from 'vitest';
import { PontuacaoService } from '@src/modules/ranking/pontuacao.service';

describe('PontuacaoService', () => {
  let service: PontuacaoService;

  beforeEach(() => {
    service = new PontuacaoService();
  });

  describe('calcular', () => {
    it('deve retornar ACERTO_EM_CHEIO (10 pontos) quando palpite é igual ao placar do jogo', () => {
      const resultado = service.calcular(
        { golsCasa: 2, golsFora: 1 },
        { golsCasa: 2, golsFora: 1 },
      );

      expect(resultado.categoriaAcerto).toBe('ACERTO_EM_CHEIO');
      expect(resultado.pontosBase).toBe(10);
    });

    it('deve retornar ACERTO_DE_RESULTADO (5 pontos) quando acerta vitória casa sem placar exato', () => {
      const resultado = service.calcular(
        { golsCasa: 3, golsFora: 1 },
        { golsCasa: 2, golsFora: 0 },
      );

      expect(resultado.categoriaAcerto).toBe('ACERTO_DE_RESULTADO');
      expect(resultado.pontosBase).toBe(5);
    });

    it('deve retornar ACERTO_DE_RESULTADO (5 pontos) quando acerta empate com placar diferente', () => {
      const resultado = service.calcular(
        { golsCasa: 1, golsFora: 1 },
        { golsCasa: 0, golsFora: 0 },
      );

      expect(resultado.categoriaAcerto).toBe('ACERTO_DE_RESULTADO');
      expect(resultado.pontosBase).toBe(5);
    });

    it('deve retornar ACERTO_DE_GOLS_UM_TIME (3 pontos) quando acerta gols de um time mas erra resultado', () => {
      const resultado = service.calcular(
        { golsCasa: 2, golsFora: 1 },
        { golsCasa: 2, golsFora: 3 },
      );

      expect(resultado.categoriaAcerto).toBe('ACERTO_DE_GOLS_UM_TIME');
      expect(resultado.pontosBase).toBe(3);
    });

    it('deve retornar ERRO_TOTAL (0 pontos) quando não acerta nada', () => {
      const resultado = service.calcular(
        { golsCasa: 1, golsFora: 0 },
        { golsCasa: 0, golsFora: 2 },
      );

      expect(resultado.categoriaAcerto).toBe('ERRO_TOTAL');
      expect(resultado.pontosBase).toBe(0);
    });

    it('deve retornar pontosBase 0 e categoriaAcerto null quando palpite é null', () => {
      const resultado = service.calcular(null, { golsCasa: 2, golsFora: 1 });

      expect(resultado.categoriaAcerto).toBeNull();
      expect(resultado.pontosBase).toBe(0);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  obterCampeonatoConfig,
  obterFaseConfig,
  validarRodada,
  CAMPEONATO_CONFIGS,
  COPA_FASES,
  BRASILEIRAO_CAMPEONATO_ID,
  COPA_DO_MUNDO_CAMPEONATO_ID,
  COPA_TOTAL_GRUPOS,
  COPA_TIMES_POR_GRUPO,
} from '@src/modules/jogos/jogos.constants';
import {
  CampeonatoNaoSuportadoError,
  FaseSlugInvalidaError,
  RodadaForaDoLimiteError,
} from '@src/common/errors/domain-errors';

describe('CampeonatoConfig', () => {
  describe('obterCampeonatoConfig', () => {
    it('deve retornar config do brasileirao', () => {
      const config = obterCampeonatoConfig('brasileirao');

      expect(config.slug).toBe('brasileirao');
      expect(config.campeonatoId).toBe(BRASILEIRAO_CAMPEONATO_ID);
      expect(config.fases).toHaveLength(1);
      expect(config.fases[0].maxRodadas).toBe(38);
    });

    it('deve retornar config da copa-do-mundo-2026', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');

      expect(config.slug).toBe('copa-do-mundo-2026');
      expect(config.campeonatoId).toBe(COPA_DO_MUNDO_CAMPEONATO_ID);
      expect(config.fases).toHaveLength(7);
    });

    it('deve lançar CampeonatoNaoSuportadoError para slug inválido', () => {
      expect(() => obterCampeonatoConfig('invalido')).toThrow(CampeonatoNaoSuportadoError);
    });

    it('deve lançar CampeonatoNaoSuportadoError para string vazia', () => {
      expect(() => obterCampeonatoConfig('')).toThrow(CampeonatoNaoSuportadoError);
    });
  });

  describe('obterFaseConfig', () => {
    it('deve retornar fase de grupos da Copa do Mundo', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');
      const fase = obterFaseConfig(config, COPA_FASES.FASE_DE_GRUPOS);

      expect(fase.slug).toBe(COPA_FASES.FASE_DE_GRUPOS);
      expect(fase.tipo).toBe('PONTOS_CORRIDOS');
      expect(fase.maxRodadas).toBe(3);
    });

    it('deve retornar fase de oitavas da Copa do Mundo', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');
      const fase = obterFaseConfig(config, COPA_FASES.OITAVAS);

      expect(fase.slug).toBe(COPA_FASES.OITAVAS);
      expect(fase.tipo).toBe('MATA_MATA');
      expect(fase.maxRodadas).toBe(1);
    });

    it('deve lançar FaseSlugInvalidaError para slug inexistente', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');

      expect(() => obterFaseConfig(config, 'fase-invalida')).toThrow(FaseSlugInvalidaError);
    });
  });

  describe('validarRodada', () => {
    it('deve aceitar rodada 1 para fase de grupos da Copa', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');
      const fase = obterFaseConfig(config, COPA_FASES.FASE_DE_GRUPOS);

      expect(() => validarRodada(1, fase)).not.toThrow();
    });

    it('deve aceitar rodada 3 para fase de grupos da Copa', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');
      const fase = obterFaseConfig(config, COPA_FASES.FASE_DE_GRUPOS);

      expect(() => validarRodada(3, fase)).not.toThrow();
    });

    it('deve rejeitar rodada 4 para fase de grupos da Copa', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');
      const fase = obterFaseConfig(config, COPA_FASES.FASE_DE_GRUPOS);

      expect(() => validarRodada(4, fase)).toThrow(RodadaForaDoLimiteError);
    });

    it('deve aceitar rodada 1 para fase eliminatória', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');
      const fase = obterFaseConfig(config, COPA_FASES.OITAVAS);

      expect(() => validarRodada(1, fase)).not.toThrow();
    });

    it('deve rejeitar rodada 2 para fase eliminatória', () => {
      const config = obterCampeonatoConfig('copa-do-mundo-2026');
      const fase = obterFaseConfig(config, COPA_FASES.OITAVAS);

      expect(() => validarRodada(2, fase)).toThrow(RodadaForaDoLimiteError);
    });

    it('deve aceitar rodada 38 para Brasileirão', () => {
      const config = obterCampeonatoConfig('brasileirao');
      const fase = obterFaseConfig(config, 'fase-unica');

      expect(() => validarRodada(38, fase)).not.toThrow();
    });

    it('deve rejeitar rodada 39 para Brasileirão', () => {
      const config = obterCampeonatoConfig('brasileirao');
      const fase = obterFaseConfig(config, 'fase-unica');

      expect(() => validarRodada(39, fase)).toThrow(RodadaForaDoLimiteError);
    });

    it('deve rejeitar rodada 0', () => {
      const config = obterCampeonatoConfig('brasileirao');
      const fase = obterFaseConfig(config, 'fase-unica');

      expect(() => validarRodada(0, fase)).toThrow(RodadaForaDoLimiteError);
    });

    it('deve rejeitar rodada negativa', () => {
      const config = obterCampeonatoConfig('brasileirao');
      const fase = obterFaseConfig(config, 'fase-unica');

      expect(() => validarRodada(-1, fase)).toThrow(RodadaForaDoLimiteError);
    });
  });

  describe('constantes', () => {
    it('COPA_TOTAL_GRUPOS deve ser 12', () => {
      expect(COPA_TOTAL_GRUPOS).toBe(12);
    });

    it('COPA_TIMES_POR_GRUPO deve ser 4', () => {
      expect(COPA_TIMES_POR_GRUPO).toBe(4);
    });

    it('fases da Copa devem ter maxRodadas corretos', () => {
      const config = CAMPEONATO_CONFIGS['copa-do-mundo-2026'];
      const faseGrupos = config.fases.find((f) => f.slug === COPA_FASES.FASE_DE_GRUPOS);
      const faseOitavas = config.fases.find((f) => f.slug === COPA_FASES.OITAVAS);
      const faseFinal = config.fases.find((f) => f.slug === COPA_FASES.FINAL);

      expect(faseGrupos?.maxRodadas).toBe(3);
      expect(faseOitavas?.maxRodadas).toBe(1);
      expect(faseFinal?.maxRodadas).toBe(1);
    });

    it('todas as fases eliminatórias devem ter tipo MATA_MATA', () => {
      const config = CAMPEONATO_CONFIGS['copa-do-mundo-2026'];
      const eliminatorias = config.fases.filter((f) => f.slug !== COPA_FASES.FASE_DE_GRUPOS);

      for (const fase of eliminatorias) {
        expect(fase.tipo).toBe('MATA_MATA');
      }
    });
  });
});

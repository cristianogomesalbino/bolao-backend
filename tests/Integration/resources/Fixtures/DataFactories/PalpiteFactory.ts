// ============================================================
// FACTORY — Palpite
// ============================================================

export interface PalpiteData {
  golsCasa: number;
  golsFora: number;
}

export interface ConfigurarDobroData {
  permitirPalpiteDobrado: boolean;
}

export function factoryPalpite(target: string): PalpiteData {
  const palpites: Record<string, PalpiteData> = {
    for_post_palpite: {
      golsCasa: 2,
      golsFora: 1,
    },
    for_patch_palpite: {
      golsCasa: 3,
      golsFora: 0,
    },
    empate: {
      golsCasa: 1,
      golsFora: 1,
    },
    goleada: {
      golsCasa: 5,
      golsFora: 0,
    },
  };

  return palpites[target];
}

export function factoryConfigurarDobro(target: string): ConfigurarDobroData {
  const configs: Record<string, ConfigurarDobroData> = {
    habilitar: { permitirPalpiteDobrado: true },
    desabilitar: { permitirPalpiteDobrado: false },
  };

  return configs[target];
}

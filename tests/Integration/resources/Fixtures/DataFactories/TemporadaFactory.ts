// ============================================================
// FACTORY — Temporada
// ============================================================

export interface TemporadaData {
  ano: number;
  campeonatoId?: string;
}

export function factoryTemporada(target: string): TemporadaData {
  const temporadas: Record<string, TemporadaData> = {
    for_post_temporada: {
      ano: 2026,
    },
    temporada_to_manage_suite: {
      ano: 2026,
    },
    temporada_for_grupo_suite: {
      ano: 2026,
    },
  };

  return temporadas[target];
}

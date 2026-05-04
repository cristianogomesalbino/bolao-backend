// ============================================================
// FACTORY — Campeonato
// ============================================================

export interface CampeonatoData {
  nome: string;
}

export function factoryCampeonato(target: string): CampeonatoData {
  const campeonatos: Record<string, CampeonatoData> = {
    for_post_campeonato: {
      nome: 'Campeonato QA Post',
    },
    campeonato_to_manage_suite: {
      nome: 'Campeonato Suite QA',
    },
    campeonato_for_temporada_suite: {
      nome: 'Campeonato Temporada Suite QA',
    },
    campeonato_for_grupo_suite: {
      nome: 'Campeonato Grupo Suite QA',
    },
  };

  return campeonatos[target];
}

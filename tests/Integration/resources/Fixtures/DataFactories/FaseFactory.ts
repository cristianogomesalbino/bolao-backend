// ============================================================
// FACTORY — Fase
// ============================================================

export interface FaseData {
  nome: string;
  tipo: 'PONTOS_CORRIDOS' | 'MATA_MATA';
  ordem: number;
  idaVolta?: boolean;
}

export function factoryFase(target: string): FaseData {
  const fases: Record<string, FaseData> = {
    for_post_fase_pontos_corridos: {
      nome: `Fase QA ${Date.now()}`,
      tipo: 'PONTOS_CORRIDOS',
      ordem: 1,
    },
    for_post_fase_mata_mata: {
      nome: `Fase Mata-Mata QA ${Date.now()}`,
      tipo: 'MATA_MATA',
      ordem: 2,
      idaVolta: true,
    },
    fase_to_manage_suite: {
      nome: 'Fase Suite QA',
      tipo: 'PONTOS_CORRIDOS',
      ordem: 1,
    },
  };

  return fases[target];
}

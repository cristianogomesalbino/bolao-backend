// ============================================================
// FACTORY — Grupo
// ============================================================

export interface GrupoData {
  nome: string;
  temporadaId?: string;
  privado: boolean;
  maxParticipantes?: number;
}

export function factoryGrupo(target: string): GrupoData {
  const grupos: Record<string, GrupoData> = {
    for_post_grupo_publico: {
      nome: `Grupo Público QA ${Date.now()}`,
      privado: false,
    },
    for_post_grupo_privado: {
      nome: `Grupo Privado QA ${Date.now()}`,
      privado: true,
    },
    grupo_to_manage_suite: {
      nome: 'Grupo Manage Suite QA',
      privado: true,
      maxParticipantes: 10,
    },
    grupo_for_membros_suite: {
      nome: 'Grupo Membros Suite QA',
      privado: true,
      maxParticipantes: 50,
    },
    for_patch_grupo: {
      nome: `Grupo Atualizado QA ${Date.now()}`,
      privado: false,
    },
  };

  return grupos[target];
}

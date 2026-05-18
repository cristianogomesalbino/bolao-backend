// ============================================================
// ORQUESTRADOR CENTRAL DE MASSA DE DADOS — equivalente ao DataBuilder.py
//
// Compõe dados de múltiplas factories em pacotes prontos por suite/cenário.
// SeedBuilders chamam build() para obter os dados compostos.
// ============================================================

import { factoryUsuario } from './DataFactories/UsuarioFactory';
import { factoryCampeonato } from './DataFactories/CampeonatoFactory';
import { factoryTemporada } from './DataFactories/TemporadaFactory';
import { factoryGrupo } from './DataFactories/GrupoFactory';
import { factoryFase } from './DataFactories/FaseFactory';

export function build(target: string, scenario: string, key?: string): any {
  const data: Record<string, Record<string, Record<string, any>>> = {
    // ---- Auth Suite ----
    for_auth_suite: {
      adm_manage: {
        usuario: factoryUsuario('adm_to_manage_auth_suite'),
      },
      super_admin: {
        usuario: factoryUsuario('super_admin_to_manage_suite'),
      },
    },

    // ---- Usuario Suite ----
    for_usuario_suite: {
      user_manage: {
        usuario: factoryUsuario('user_to_manage_usuario_suite'),
      },
      super_admin: {
        usuario: factoryUsuario('super_admin_to_manage_suite'),
      },
    },

    // ---- Campeonato Suite ----
    for_campeonato_suite: {
      user_manage: {
        usuario: factoryUsuario('user_to_manage_campeonato_suite'),
        campeonato: factoryCampeonato('campeonato_to_manage_suite'),
      },
      super_admin: {
        usuario: factoryUsuario('super_admin_to_manage_suite'),
      },
    },

    // ---- Temporada Suite ----
    for_temporada_suite: {
      user_manage: {
        usuario: factoryUsuario('user_to_manage_campeonato_suite'),
        campeonato: factoryCampeonato('campeonato_for_temporada_suite'),
        temporada: factoryTemporada('temporada_to_manage_suite'),
      },
      super_admin: {
        usuario: factoryUsuario('super_admin_to_manage_suite'),
      },
    },

    // ---- Grupo Suite ----
    for_grupo_suite: {
      user_admin: {
        usuario: factoryUsuario('user_to_manage_grupo_suite'),
        campeonato: factoryCampeonato('campeonato_for_grupo_suite'),
        temporada: factoryTemporada('temporada_for_grupo_suite'),
        grupo: factoryGrupo('grupo_to_manage_suite'),
      },
      user_member: {
        usuario: factoryUsuario('user_member_grupo_suite'),
      },
      user_to_add: {
        usuario: factoryUsuario('user_to_add_grupo_suite'),
      },
      user_fora: {
        usuario: factoryUsuario('user_to_manage_campeonato_suite'),
      },
    },

    // ---- GrupoUsuario Suite ----
    for_grupo_usuario_suite: {
      user_admin: {
        usuario: factoryUsuario('user_to_manage_grupo_suite'),
        campeonato: factoryCampeonato('campeonato_for_grupo_suite'),
        temporada: factoryTemporada('temporada_for_grupo_suite'),
        grupo: factoryGrupo('grupo_for_membros_suite'),
      },
      user_member: {
        usuario: factoryUsuario('user_member_grupo_suite'),
      },
      user_to_add: {
        usuario: factoryUsuario('user_to_add_grupo_suite'),
      },
    },

    // ---- Fase Suite ----
    for_fase_suite: {
      user_manage: {
        usuario: factoryUsuario('user_to_manage_campeonato_suite'),
        campeonato: factoryCampeonato('campeonato_for_temporada_suite'),
        temporada: factoryTemporada('temporada_to_manage_suite'),
        fase: factoryFase('fase_to_manage_suite'),
      },
      super_admin: {
        usuario: factoryUsuario('super_admin_to_manage_suite'),
      },
    },

    // ---- Palpite Suite ----
    for_palpite_suite: {
      user_manage: {
        usuario: factoryUsuario('user_to_manage_campeonato_suite'),
        campeonato: factoryCampeonato('campeonato_for_temporada_suite'),
        temporada: factoryTemporada('temporada_to_manage_suite'),
        fase: factoryFase('fase_to_manage_suite'),
      },
      super_admin: {
        usuario: factoryUsuario('super_admin_to_manage_suite'),
      },
    },
  };

  const result = data[target][scenario];
  return key ? result[key] : result;
}

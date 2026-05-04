// ============================================================
// ORQUESTRADOR CENTRAL DE MASSA DE DADOS — equivalente ao DataBuilder.py
// ============================================================

import { factoryUsuario } from './DataFactories/UsuarioFactory';
import { factoryCampeonato } from './DataFactories/CampeonatoFactory';
import { factoryTemporada } from './DataFactories/TemporadaFactory';
import { factoryGrupo } from './DataFactories/GrupoFactory';

export function build(target: string, scenario: string): Record<string, any> {
  const data: Record<string, any> = {
    for_auth_suite: {
      adm_manage: {
        usuario: factoryUsuario('adm_to_manage_auth_suite'),
      },
    },
    for_usuario_suite: {
      user_manage: {
        usuario: factoryUsuario('user_to_manage_usuario_suite'),
      },
      super_admin: {
        usuario: factoryUsuario('super_admin_to_manage_suite'),
      },
    },
    for_campeonato_suite: {
      user_manage: {
        usuario: factoryUsuario('user_to_manage_campeonato_suite'),
        campeonato: factoryCampeonato('campeonato_to_manage_suite'),
      },
    },
    for_temporada_suite: {
      campeonato: {
        campeonato: factoryCampeonato('campeonato_for_temporada_suite'),
        temporada: factoryTemporada('temporada_to_manage_suite'),
      },
    },
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
    },
  };

  return data[target][scenario];
}

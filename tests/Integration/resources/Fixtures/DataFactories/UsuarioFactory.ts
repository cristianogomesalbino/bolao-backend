// ============================================================
// FACTORY — Usuario
// ============================================================

export interface UsuarioData {
  nome: string;
  email: string;
  senha: string;
  perfil?: 'SUPER_ADMIN' | 'USER';
  ativo?: boolean;
}

export function factoryUsuario(target: string): UsuarioData {
  const usuarios: Record<string, UsuarioData> = {
    // Admin geral para gerenciar suites
    adm_to_manage_auth_suite: {
      nome: 'Admin Auth Suite QA',
      email: 'adm@authsuite.qa',
      senha: 'Teste123!',
      perfil: 'USER',
    },
    // Usuário para login inválido
    to_invalid_auth_suite: {
      nome: 'Invalid Auth QA',
      email: 'invalid@authsuite.qa',
      senha: 'SenhaErrada123!',
    },
    // Super admin para suites que precisam de permissão elevada
    super_admin_to_manage_suite: {
      nome: 'Super Admin Suite QA',
      email: 'superadmin@suite.qa',
      senha: 'Teste123!',
      perfil: 'SUPER_ADMIN',
    },
    // Usuário comum para testes de CRUD
    user_to_manage_usuario_suite: {
      nome: 'User Manage Suite QA',
      email: 'user@usuariosuite.qa',
      senha: 'Teste123!',
      perfil: 'USER',
    },
    // Usuário para criar/gerenciar grupos
    user_to_manage_grupo_suite: {
      nome: 'User Grupo Suite QA',
      email: 'user@gruposuite.qa',
      senha: 'Teste123!',
      perfil: 'USER',
    },
    // Segundo usuário para testes de grupo (membro)
    user_member_grupo_suite: {
      nome: 'User Membro Grupo QA',
      email: 'membro@gruposuite.qa',
      senha: 'Teste123!',
      perfil: 'USER',
    },
    // Terceiro usuário para testes de grupo (adicionar por email)
    user_to_add_grupo_suite: {
      nome: 'User Adicionar Grupo QA',
      email: 'adicionar@gruposuite.qa',
      senha: 'Teste123!',
      perfil: 'USER',
    },
    // Usuário para testes de campeonato/temporada
    user_to_manage_campeonato_suite: {
      nome: 'User Campeonato Suite QA',
      email: 'user@campeonatosuite.qa',
      senha: 'Teste123!',
      perfil: 'USER',
    },
    // Usuário inativo
    user_inativo: {
      nome: 'User Inativo QA',
      email: 'inativo@suite.qa',
      senha: 'Teste123!',
      perfil: 'USER',
      ativo: false,
    },
    // Payload para POST /usuarios (criação via API)
    for_post_usuario: {
      nome: 'Novo Usuario QA',
      email: `qa.post.${Date.now()}@usuario.qa`,
      senha: 'Teste123!',
    },
    // Payload para PUT/PATCH usuario
    for_patch_usuario: {
      nome: `Usuario Atualizado QA ${Date.now()}`,
      email: `qa.patch.${Date.now()}@usuario.qa`,
      senha: 'Teste123!',
    },
  };

  return usuarios[target];
}

/**
 * Usuários para testes de permissão (AttemptRequests)
 */
export function factoryUsuarioAttemptRequests(): Record<string, UsuarioData> {
  return {
    super_admin: {
      nome: 'Super Admin Attempt QA',
      email: 'superadmin@attempt.qa',
      senha: 'Teste123!',
      perfil: 'SUPER_ADMIN',
    },
    user: {
      nome: 'User Attempt QA',
      email: 'user@attempt.qa',
      senha: 'Teste123!',
      perfil: 'USER',
    },
    para_deletar: {
      nome: 'Teste Exclusao QA',
      email: 'teste-exclusao@attempt.qa',
      senha: 'Teste123!',
      perfil: 'USER',
    },
    unauthorized: {
      nome: 'Unauthorized Attempt QA',
      email: 'unauthorized@qa.bolao',
      senha: 'Teste123!',
    },
  };
}

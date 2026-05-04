// ============================================================
// MOCK DATA BUILDER — Grupo (payloads e rotas por endpoint)
// ============================================================

export function buildGrupoMock(
  endpoint: string,
  overrides?: Record<string, any>,
) {
  const mocks: Record<
    string,
    { route: string; payload?: Record<string, any> }
  > = {
    post_grupo: {
      route: 'grupos',
      payload: {
        nome: `Grupo Robot QA ${Date.now()}`,
        privado: false,
        temporadaId: '',
      },
    },
    get_grupos: {
      route: 'grupos',
    },
    get_grupo_by_id: {
      route: 'grupos/', // append ID
    },
    patch_grupo: {
      route: 'grupos/', // append ID
      payload: { nome: `Grupo Atualizado ${Date.now()}` },
    },
    patch_grupo_status: {
      route: 'grupos/', // append ID + /status
      payload: { ativo: false },
    },
    delete_grupo: {
      route: 'grupos/', // append ID
    },
    post_entrar: {
      route: 'grupos/entrar',
      payload: { codigoConvite: '' },
    },
    post_adicionar: {
      route: 'grupos/', // append ID + /adicionar
      payload: { email: '' },
    },
    get_membros: {
      route: 'grupos/', // append ID + /membros
    },
    delete_sair: {
      route: 'grupos/', // append ID + /sair
    },
    delete_remover_membro: {
      route: 'grupos/', // append ID + /usuarios/ + ID
    },
  };

  const mock = { ...mocks[endpoint] };
  if (overrides?.payload) {
    mock.payload = { ...mock.payload, ...overrides.payload };
  }
  if (overrides?.route) {
    mock.route = overrides.route;
  }
  return mock;
}

// ============================================================
// MOCK DATA BUILDER — Usuario (payloads e rotas por endpoint)
// ============================================================

export function buildUsuarioMock(
  endpoint: string,
  overrides?: Record<string, any>,
) {
  const mocks: Record<
    string,
    { route: string; payload?: Record<string, any> }
  > = {
    post_usuario: {
      route: 'usuarios',
      payload: {
        nome: 'Robot User QA',
        email: `robot.${Date.now()}@post.usuario.qa`,
        senha: 'Teste123!',
      },
    },
    get_usuario_me: {
      route: 'usuarios/me',
    },
    get_usuario_by_id: {
      route: 'usuarios/', // append ID no spec
    },
    patch_usuario: {
      route: 'usuarios/', // append ID no spec
      payload: { nome: 'Robot User Atualizado QA' },
    },
    delete_usuario: {
      route: 'usuarios/', // append ID no spec
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

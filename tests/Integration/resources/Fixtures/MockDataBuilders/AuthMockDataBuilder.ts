// ============================================================
// MOCK DATA BUILDER — Auth (payloads e rotas por endpoint)
// ============================================================

export function buildAuthMock(
  endpoint: string,
  overrides?: Record<string, any>,
) {
  const mocks: Record<
    string,
    { route: string; payload?: Record<string, any> }
  > = {
    post_login: {
      route: 'auth/login',
      payload: { email: 'adm@authsuite.qa', senha: 'Teste123!' },
    },
    post_logout: {
      route: 'auth/logout',
      payload: { refreshToken: 'qualquer' },
    },
    post_refresh: {
      route: 'auth/refresh',
      payload: { refreshToken: 'qualquer' },
    },
    post_esqueci_senha: {
      route: 'auth/esqueci-senha',
      payload: { email: 'qualquer@teste.qa' },
    },
    post_resetar_senha: {
      route: 'auth/resetar-senha',
      payload: { token: 'token-invalido', novaSenha: 'Nova123!' },
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

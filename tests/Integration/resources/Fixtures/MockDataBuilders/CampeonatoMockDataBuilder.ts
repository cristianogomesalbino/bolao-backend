// ============================================================
// MOCK DATA BUILDER — Campeonato (payloads e rotas por endpoint)
// ============================================================

export function buildCampeonatoMock(
  endpoint: string,
  overrides?: Record<string, any>,
) {
  const mocks: Record<
    string,
    { route: string; payload?: Record<string, any> }
  > = {
    post_campeonato: {
      route: 'campeonatos',
      payload: { nome: `Campeonato Robot QA ${Date.now()}` },
    },
    get_campeonatos: {
      route: 'campeonatos',
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

// ============================================================
// MOCK DATA BUILDER — Temporada (payloads e rotas por endpoint)
// ============================================================

import { INVALID } from '../../Base/constants';

export function buildTemporadaMock(
  endpoint: string,
  overrides?: Record<string, any>,
) {
  const mocks: Record<
    string,
    { route: string; payload?: Record<string, any> }
  > = {
    post_temporada: {
      route: 'temporadas',
      payload: { ano: 2026, campeonatoId: INVALID.UUID_INEXISTENTE },
    },
    get_temporadas: {
      route: 'temporadas',
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

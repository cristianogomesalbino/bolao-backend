// ============================================================
// MOCK DATA BUILDER — Fase (payloads e rotas por endpoint)
// ============================================================

import { INVALID } from '../../Base/constants';

export function buildFaseMock(
  endpoint: string,
  overrides?: Record<string, any>,
) {
  const mocks: Record<
    string,
    { route: string; payload?: Record<string, any> }
  > = {
    post_fase: {
      route: `temporadas/${INVALID.UUID_INEXISTENTE}/fases`,
      payload: { nome: 'Fase Mock QA', tipo: 'PONTOS_CORRIDOS', ordem: 1 },
    },
    get_fases: {
      route: `temporadas/${INVALID.UUID_INEXISTENTE}/fases`,
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

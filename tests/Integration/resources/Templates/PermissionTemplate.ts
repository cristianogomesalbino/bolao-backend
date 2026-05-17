// ============================================================
// TEMPLATE — Permissão (controle de acesso por perfil)
//
// Testa quem pode acessar cada endpoint:
// 1. attemptRequest                  — Valida status code por perfil
// 2. attemptRequestForRules          — Valida com avaliação de comportamento
// 3. attemptRequestForRulesAuthorized — Valida que perfil TEM acesso
// 4. describeAttemptSuite            — Orquestrador de suite completa
// ============================================================

import { test, APIRequestContext, expect } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';
import { assertSemMensagemNaoTratada } from '../Base/helpers';
import {
  evaluateResponseBehavior,
  evaluateResponseForRulesAuthorized,
} from './ResponseEvaluator';
import { buildPublicRoutes } from '../Fixtures/DataFactories/RouteFactory';

// ---- Tipos ----

export interface AttemptScenario {
  perfil: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  statusEsperado: number;
  /** Descrição do motivo/contexto (ex: 'sem autenticação', 'UUID inválido') */
  descricao?: string;
  /** Se definido, o teste é pulado com este motivo */
  skip?: string;
  /** Sobrescreve a rota para este cenário (ex: UUID inválido, rota inexistente) */
  routeOverride?: string;
}

export interface AttemptMockData {
  route: string;
  payload?: Record<string, any>;
  resourceId?: string;
  inexisticId?: string;
}

export interface AttemptConfig {
  mockData: AttemptMockData;
  usuarios: Record<string, { email: string; senha: string }>;
}

export type AttemptSetupFn = (
  request: APIRequestContext,
) => Promise<Record<string, any>>;
export type AttemptRouteResolver = (setupData: Record<string, any>) => string;
export type AttemptPayloadResolver = (
  setupData: Record<string, any>,
) => Record<string, any>;

// ---- 1. Attempt Request (permissão por perfil) ----

export async function attemptRequest(
  request: APIRequestContext,
  scenario: AttemptScenario,
  config: AttemptConfig,
): Promise<void> {
  const method = scenario.method.toLowerCase() as
    | 'get'
    | 'post'
    | 'patch'
    | 'put'
    | 'delete';

  // Resolve rota: substitui resource_id se presente
  let route = config.mockData.route;
  if (config.mockData.resourceId && route.includes('resource_id')) {
    route = route.replace('resource_id', config.mockData.resourceId);
  }
  const url = `${BASE_URL}${route}`;

  // Headers: sem_token não envia Authorization
  let headers: Record<string, string> | undefined;
  if (scenario.perfil !== 'sem_token') {
    const usuario = config.usuarios[scenario.perfil];
    if (!usuario) {
      throw new Error(
        `Perfil "${scenario.perfil}" não encontrado no mapa de usuários`,
      );
    }
    headers = await setHeaders(request, usuario);
  }

  // Monta options
  const options: any = {};
  if (headers) options.headers = headers;

  // Payload: envia em POST, PATCH, PUT
  const isPayloadMethod = ['post', 'patch', 'put'].includes(method);
  if (config.mockData.payload && isPayloadMethod) {
    options.data = config.mockData.payload;
  }

  const response = await request[method](url, options);

  try {
    await logRequestResponse(
      scenario.method,
      url,
      config.mockData.payload,
      headers,
      response,
    );
  } catch {
    /* ignora fora de contexto de teste */
  }

  // Valida mensagens não tratadas do framework
  await assertSemMensagemNaoTratada(response);

  // Mensagem de erro contextualizada para facilitar debug
  const usuario = scenario.perfil !== 'sem_token' ? config.usuarios[scenario.perfil] : null;
  const contexto = [
    `Perfil: ${scenario.perfil}`,
    usuario ? `Email: ${usuario.email}` : 'Sem token',
    `Rota: ${scenario.method} ${url}`,
    response.status() === 401 ? '⚠️  401 = Login falhou. Verificar se o usuário existe no banco.' : '',
    response.status() === 404 ? '⚠️  404 = Recurso não encontrado. Verificar se o setup criou o registro.' : '',
  ].filter(Boolean).join(' | ');

  expect(response.status(), contexto).toBe(scenario.statusEsperado);
}

// ---- 2. Attempt Request For Rules (com avaliação de comportamento) ----

export async function attemptRequestForRules(
  request: APIRequestContext,
  params: {
    usuario: { email: string; senha: string };
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    route: string;
    routeAlias: string;
    statusEsperado?: number;
    payload?: Record<string, any>;
  },
): Promise<void> {
  const method = params.method.toLowerCase() as
    | 'get'
    | 'post'
    | 'patch'
    | 'put'
    | 'delete';
  const statusEsperado = params.statusEsperado ?? 403;
  const url = `${BASE_URL}${params.route}`;

  const headers = await setHeaders(request, params.usuario);

  const options: any = { headers };
  if (params.payload && ['post', 'patch', 'put'].includes(method)) {
    options.data = params.payload;
  }

  const response = await request[method](url, options);

  let body: any;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  try {
    await logRequestResponse(
      params.method,
      url,
      params.payload,
      headers,
      response,
    );
  } catch {
    /* ignora */
  }

  // Avalia comportamento da resposta (500 = bug, 200 sem permissão = falha de segurança, etc.)
  const publicRoutes = buildPublicRoutes();
  const isPublicRoute = params.routeAlias in publicRoutes;
  evaluateResponseBehavior(response.status(), body, isPublicRoute);

  expect(response.status()).toBe(statusEsperado);
}

// ---- 3. Attempt Request For Rules Authorized (valida que perfil TEM acesso) ----

export async function attemptRequestForRulesAuthorized(
  request: APIRequestContext,
  params: {
    usuario: { email: string; senha: string };
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    route: string;
    payload?: Record<string, any>;
  },
): Promise<void> {
  const method = params.method.toLowerCase() as
    | 'get'
    | 'post'
    | 'patch'
    | 'put'
    | 'delete';
  const url = `${BASE_URL}${params.route}`;

  const headers = await setHeaders(request, params.usuario);

  const options: any = { headers };
  if (params.payload && ['post', 'patch', 'put'].includes(method)) {
    options.data = params.payload;
  }

  const response = await request[method](url, options);

  try {
    await logRequestResponse(
      params.method,
      url,
      params.payload,
      headers,
      response,
    );
  } catch {
    /* ignora */
  }

  // Avalia: se recebeu 403/401/500 = falha (deveria ter acesso)
  evaluateResponseForRulesAuthorized(response.status());
}

// ---- Orquestrador: helper para beforeAll ----

export async function runAttemptSetup(
  config: {
    seed?: () => Promise<void | Record<string, any>>;
    setup?: AttemptSetupFn;
  },
  request?: APIRequestContext,
): Promise<Record<string, any>> {
  if (config.seed) {
    await config.seed();
  }
  if (config.setup && request) {
    return config.setup(request);
  }
  return {};
}

// ---- Helper para montar config dinâmica ----

export function buildAttemptConfig(params: {
  mockData?: AttemptMockData;
  usuarios: Record<string, { email: string; senha: string }>;
  setupData?: Record<string, any>;
  routeResolver?: AttemptRouteResolver;
  payloadResolver?: AttemptPayloadResolver;
}): AttemptConfig {
  const route = params.routeResolver
    ? params.routeResolver(params.setupData || {})
    : params.mockData!.route;

  const payload = params.payloadResolver
    ? params.payloadResolver(params.setupData || {})
    : params.mockData?.payload;

  return {
    mockData: { route, payload },
    usuarios: params.usuarios,
  };
}

// ---- Helper para nome do teste ----

export function attemptName(index: number, scenario: AttemptScenario): string {
  return `Attempt ${String(index + 1).padStart(2, '0')} - ${scenario.perfil} deve receber ${scenario.statusEsperado}`;
}

// ---- Orquestrador de suite completa ----

/**
 * Tupla de cenário de permissão: [perfil, method, statusEsperado, descricao, skip?, routeOverride?]
 */
export type AttemptTuple = [string, string, number, string, string?, string?];

export interface AttemptSuiteParams {
  descricao: string;
  scenarios: AttemptTuple[];
  usuarios: Record<string, { email: string; senha: string }>;
  mockData?: AttemptMockData;
  seed?: () => Promise<void | Record<string, any>>;
  setup?: AttemptSetupFn;
  routeResolver?: AttemptRouteResolver;
  payloadResolver?: AttemptPayloadResolver;
}

function tupleToScenario(tuple: AttemptTuple): AttemptScenario {
  const [perfil, method, statusEsperado, descricao, skip, routeOverride] = tuple;
  return {
    perfil,
    method: method as AttemptScenario['method'],
    statusEsperado,
    descricao,
    skip,
    routeOverride,
  };
}

/**
 * Registra uma suite completa de AttemptRequests.
 * O spec passa o `test` importado do @playwright/test para
 * que o path no terminal aponte para o spec, não para o template.
 */
export function describeAttemptSuite(
  t: typeof test,
  params: AttemptSuiteParams,
): void {
  let setupData: Record<string, any> = {};

  t.describe(params.descricao, () => {
    t.beforeAll(async ({ request }) => {
      if (params.seed) {
        const seedResult = await params.seed();
        if (seedResult && typeof seedResult === 'object') {
          setupData = seedResult;
        }
      }
      if (params.setup) {
        setupData = { ...setupData, ...(await params.setup(request)) };
      }
    });

    for (const [i, tuple] of params.scenarios.entries()) {
      const scenario = tupleToScenario(tuple);
      const detalhe = scenario.descricao ? ` quando ${scenario.descricao}` : '';
      const name = `Attempt ${String(i + 1).padStart(2, '0')} - ${scenario.perfil} deve receber ${scenario.statusEsperado}${detalhe}`;

      const testFn = scenario.skip ? t.skip : t;
      testFn(name, async ({ request }) => {
        let route: string;
        if (scenario.routeOverride) {
          route = scenario.routeOverride;
        } else if (params.routeResolver) {
          route = params.routeResolver(setupData);
        } else {
          route = params.mockData!.route;
        }

        const payload = params.payloadResolver
          ? params.payloadResolver(setupData)
          : params.mockData?.payload;

        const config: AttemptConfig = {
          mockData: { route, payload },
          usuarios: params.usuarios,
        };

        await attemptRequest(request, scenario, config);
      });
    }
  });
}

// ============================================================
// TEMPLATE — Attempt Requests (equivalente ao AttemptRequestsTemplate.robot)
//
// 4 keywords principais:
// 1. attemptRequest           — Testa permissão por perfil (status code)
// 2. attemptRequestForRules   — Testa regras de acesso com avaliação de comportamento
// 3. attemptRequestForRulesAuthorized — Testa que perfil autorizado tem acesso
// 4. attemptWithInvalidField  — Testa payload inválido com validação de mensagem por campo
// ============================================================

import { test, APIRequestContext, expect } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';
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
  /** Se definido, o teste é pulado com este motivo */
  skip?: string;
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

export interface AttemptSuiteConfig {
  descricao: string;
  scenarios: AttemptScenario[];
  usuarios: Record<string, { email: string; senha: string }>;
  mockData?: AttemptMockData;
  setup?: AttemptSetupFn;
  seed?: () => Promise<void>;
  routeResolver?: AttemptRouteResolver;
  payloadResolver?: AttemptPayloadResolver;
}

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

  expect(response.status()).toBe(scenario.statusEsperado);
}

// ---- 2. Attempt Request For Rules Test (com avaliação de comportamento) ----

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

// ---- 4. Attempt With Invalid Field (validação de payload por campo) ----

export async function attemptWithInvalidField(
  request: APIRequestContext,
  params: {
    usuario: { email: string; senha: string };
    method: 'POST' | 'PUT' | 'PATCH';
    route: string;
    basePayload: Record<string, any>;
    key: string;
    inputField: any;
    statusEsperado: number;
    expectedMessage: string;
    arrayKey?: string;
  },
): Promise<void> {
  const method = params.method.toLowerCase() as 'post' | 'put' | 'patch';
  const url = `${BASE_URL}${params.route}`;

  const headers = await setHeaders(request, params.usuario);

  // Clona payload e substitui o campo com valor inválido
  const payload = { ...params.basePayload };
  payload[params.key] = params.inputField;

  const response = await request[method](url, { headers, data: payload });

  try {
    await logRequestResponse(params.method, url, payload, headers, response);
  } catch {
    /* ignora */
  }

  expect(response.status()).toBe(params.statusEsperado);

  // Validação de mensagem de erro por campo (busca inteligente de chaves)
  const body = await response.json();
  const errors = body.erros || body.errors || body;

  // Monta lista de chaves possíveis para buscar o erro
  const keysToTry: string[] = [];
  const basicKey = params.arrayKey
    ? `${params.key}.${params.arrayKey}`
    : params.key;
  keysToTry.push(basicKey);

  // Chave com índice 0 (comum para arrays)
  if (params.arrayKey) {
    keysToTry.push(`${params.key}.0.${params.arrayKey}`);
  } else {
    keysToTry.push(`${params.key}.0`);
  }

  // Tenta encontrar o campo de erro
  let fieldErrors: any = null;
  if (Array.isArray(errors)) {
    // Formato padrão do projeto: { erros: [{ campo, mensagens }] }
    const found = errors.find(
      (e: any) => e.campo === params.key || e.campo === basicKey,
    );
    if (found) {
      fieldErrors = found.mensagens || found;
    }
  } else if (typeof errors === 'object') {
    for (const tryKey of keysToTry) {
      if (tryKey in errors) {
        fieldErrors = errors[tryKey];
        break;
      }
    }

    // Busca parcial: chaves que começam com key. (ex: endereco.0.cep)
    if (!fieldErrors) {
      for (const errorKey of Object.keys(errors)) {
        const startsWith = errorKey.startsWith(`${params.key}.`);
        const endsWith = params.arrayKey
          ? errorKey.endsWith(`.${params.arrayKey}`)
          : true;
        if (startsWith && endsWith) {
          fieldErrors = errors[errorKey];
          break;
        }
      }
    }
  }

  // Se não encontrou campo específico, busca na string completa
  const errorsAsString = JSON.stringify(fieldErrors || errors);
  expect(errorsAsString).toContain(params.expectedMessage);
}

// ---- Orquestrador: helper para beforeAll ----

export async function runAttemptSetup(
  config: {
    seed?: () => Promise<void>;
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

export interface AttemptSuiteParams {
  descricao: string;
  scenarios: AttemptScenario[];
  usuarios: Record<string, { email: string; senha: string }>;
  mockData?: AttemptMockData;
  seed?: () => Promise<void>;
  setup?: AttemptSetupFn;
  routeResolver?: AttemptRouteResolver;
  payloadResolver?: AttemptPayloadResolver;
}

/**
 * Registra uma suite completa de AttemptRequests.
 * O spec passa o `test` importado do @playwright/test para
 * que o path no terminal aponte para o spec, não para o template.
 *
 * Uso:
 * ```ts
 * import { test } from '@playwright/test';
 * import { describeAttemptSuite } from '...Template';
 *
 * describeAttemptSuite(test, { descricao, scenarios, ... });
 * ```
 */
export function describeAttemptSuite(
  t: typeof test,
  params: AttemptSuiteParams,
): void {
  let setupData: Record<string, any> = {};

  t.describe(params.descricao, () => {
    t.beforeAll(async ({ request }) => {
      if (params.seed) {
        await params.seed();
      }
      if (params.setup) {
        setupData = await params.setup(request);
      }
    });

    for (const [i, scenario] of params.scenarios.entries()) {
      const name = `Attempt ${String(i + 1).padStart(2, '0')} - ${scenario.perfil} deve receber ${scenario.statusEsperado}`;

      const testFn = scenario.skip ? t.skip : t;
      testFn(name, async ({ request }) => {
        const route = params.routeResolver
          ? params.routeResolver(setupData)
          : params.mockData!.route;

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

// ---- Orquestrador de suite de campos inválidos ----

/**
 * Tupla de cenário: [campo, valor, statusEsperado, mensagem, skip?]
 */
export type InvalidFieldTuple = [string, any, number, string, string?];

export interface InvalidFieldSuiteParams {
  descricao: string;
  /** Cenários como tuplas: [campo, valor, status, mensagem, skip?] */
  scenarios: InvalidFieldTuple[];
  usuario: { email: string; senha: string };
  route: string;
  basePayload: Record<string, any>;
  seed?: () => Promise<void>;
  /** Gera campos únicos por cenário para evitar conflitos */
  uniqueFieldResolver?: (
    index: number,
    campo: string,
  ) => Record<string, any>;
}

/**
 * Registra uma suite de testes de campos inválidos.
 * Equivalente ao "Attempt Requests With Invalid Values In Fields Of The Payload" do Robot.
 *
 * Cada cenário é uma tupla: [campo, valor, statusEsperado, mensagem, skip?]
 *
 * Uso:
 * ```ts
 * describeInvalidFieldSuite(test, {
 *   descricao: 'Attempt POST /usuarios - Campos Inválidos',
 *   route: 'usuarios',
 *   usuario: USUARIO_ATTEMPT_USUARIOS.user,
 *   basePayload: { nome: 'QA', email: 'qa@teste.qa', senha: 'Teste123!' },
 *   seed: seedUsuarioAttempt,
 *   scenarios: [
 *     ['nome',  EMPTY,          422, 'Nome é obrigatório'],
 *     ['nome',  CHAR_256,       422, 'Nome deve ter no máximo 255 caracteres', 'Backend não valida'],
 *     ['email', INVALID_EMAIL,  422, 'Email inválido'],
 *   ],
 *   uniqueFieldResolver: (i) => ({ email: `invalid.${i}.${Date.now()}@teste.qa` }),
 * });
 * ```
 */
export function describeInvalidFieldSuite(
  t: typeof test,
  params: InvalidFieldSuiteParams,
): void {
  t.describe(params.descricao, () => {
    if (params.seed) {
      t.beforeAll(async () => {
        await params.seed!();
      });
    }

    for (const [index, tuple] of params.scenarios.entries()) {
      const [campo, valor, statusEsperado, mensagem, skip] = tuple;
      const label = formatFieldLabel(valor);
      const name = `Attempt ${String(index + 1).padStart(2, '0')} - ${campo} ${label} deve retornar ${statusEsperado}`;

      const testFn = skip ? t.skip : t;
      testFn(name, async ({ request }) => {
        const payloadOverrides = params.uniqueFieldResolver
          ? params.uniqueFieldResolver(index, campo)
          : {};

        await attemptWithInvalidField(request, {
          usuario: params.usuario,
          method: 'POST',
          route: params.route,
          basePayload: { ...params.basePayload, ...payloadOverrides },
          key: campo,
          inputField: valor,
          statusEsperado,
          expectedMessage: mensagem,
        });
      });
    }
  });
}

function formatFieldLabel(valor: any): string {
  if (valor === null) return 'null';
  if (valor === '') return 'vazio';
  if (typeof valor === 'number') return 'MAX_INT';
  return `"${String(valor).substring(0, 20)}"`;
}

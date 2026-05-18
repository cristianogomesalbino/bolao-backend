// ============================================================
// TEMPLATE — Campos Inválidos (validação de payload)
//
// Testa que o backend rejeita input malformado:
// 1. attemptWithInvalidField      — Testa um campo inválido com validação de mensagem
// 2. describeInvalidFieldSuite    — Orquestrador de suite completa
// ============================================================

import { test, APIRequestContext, expect } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';
import { assertSemMensagemNaoTratada } from '../Base/helpers';

// ---- Tipos ----

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
  seed?: () => Promise<void | Record<string, any>>;
  /** Setup com request (para criar dados via API quando necessário) */
  setup?: (request: APIRequestContext) => Promise<Record<string, any>>;
  /** Resolve a rota dinamicamente com dados do seed/setup (ex: rota com :grupoId) */
  routeResolver?: (data: Record<string, any>) => string;
  /** Gera campos únicos por cenário para evitar conflitos */
  uniqueFieldResolver?: (
    index: number,
    campo: string,
  ) => Record<string, any>;
}

// ---- Attempt With Invalid Field ----

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

  const headers = await setHeaders(request, params.usuario, { silent: true });

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

  // Validação de mensagem de erro por campo
  const body = await response.json();
  const errors = body.erros || body.errors || body;

  const fieldErrors = findFieldErrors(errors, params.key, params.arrayKey);

  const errorsAsString = JSON.stringify(fieldErrors || errors);
  expect(errorsAsString).toContain(params.expectedMessage);
  await assertSemMensagemNaoTratada(errorsAsString);
}

// ---- Orquestrador de suite ----

/**
 * Registra uma suite de testes de campos inválidos.
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
    let seedData: Record<string, any> = {};
    let resolvedRoute = params.route;

    t.beforeAll(async ({ request }) => {
      if (params.seed) {
        const result = await params.seed();
        if (result && typeof result === 'object') {
          seedData = result;
        }
      }
      if (params.setup) {
        seedData = { ...seedData, ...(await params.setup(request)) };
      }
      if (params.routeResolver) {
        resolvedRoute = params.routeResolver(seedData);
      }

      // Loga dados do seed no Allure para debug
      if (Object.keys(seedData).length > 0) {
        try {
          test.info().attach('Seed Data', {
            body: JSON.stringify(seedData, null, 2),
            contentType: 'application/json',
          });
        } catch { /* ignora fora de contexto */ }
      }
    });

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
          route: resolvedRoute,
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

// ---- Helpers privados ----

function findFieldErrors(errors: any, key: string, arrayKey?: string): any {
  const basicKey = arrayKey ? `${key}.${arrayKey}` : key;

  const keysToTry: string[] = [basicKey];
  if (arrayKey) {
    keysToTry.push(`${key}.0.${arrayKey}`);
  } else {
    keysToTry.push(`${key}.0`);
  }

  // Formato padrão: { erros: [{ campo, mensagens }] }
  if (Array.isArray(errors)) {
    const found = errors.find(
      (e: any) => e.campo === key || e.campo === basicKey,
    );
    if (found) return found.mensagens || found;
  } else if (typeof errors === 'object') {
    for (const tryKey of keysToTry) {
      if (tryKey in errors) return errors[tryKey];
    }

    // Busca parcial: chaves que começam com key.
    for (const errorKey of Object.keys(errors)) {
      const startsWith = errorKey.startsWith(`${key}.`);
      const endsWith = arrayKey ? errorKey.endsWith(`.${arrayKey}`) : true;
      if (startsWith && endsWith) return errors[errorKey];
    }
  }

  return null;
}

function formatFieldLabel(valor: any): string {
  if (valor === null) return 'null';
  if (valor === '') return 'vazio';
  if (typeof valor === 'number') return 'MAX_INT';
  return `"${String(valor).substring(0, 20)}"`;
}

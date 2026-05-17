// ============================================================
// TEMPLATE — Security Suite (SQL Injection, XSS, Mass Assignment, Concorrência, Stacktrace)
//
// Template reutilizável para qualquer endpoint/projeto.
// Testa a API via HTTP — agnóstico de linguagem do backend.
// ============================================================

import { test, APIRequestContext, expect } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';
import { assertSemMensagemNaoTratada } from '../Base/helpers';
import { ATTACK, HTTP } from '../Base/constants';

// ---- Tipos ----

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface SecuritySuiteParams {
  descricao: string;
  route: string;
  method: HttpMethod;
  basePayload: Record<string, any>;
  /** Se undefined, testa como rota pública (sem token) */
  usuario?: { email: string; senha: string };
  /** Seed para criar dados necessários antes da suite (pode retornar dados para routeResolver) */
  seed?: () => Promise<void | Record<string, any>>;
  /** Cleanup após a suite */
  cleanup?: () => Promise<void>;
  /** Resolve a rota dinamicamente com dados do seed (ex: rota com :id) */
  routeResolver?: (seedData: Record<string, any>) => string;

  sqlInjection?: {
    /** Campos onde testar injeção SQL */
    campos: string[];
    /** Status esperado (422 se validação barra, 401 se chega ao service) */
    statusEsperado: number | number[];
  };

  xss?: {
    /** Campos onde testar XSS */
    campos: string[];
    /** Status esperado */
    statusEsperado: number | number[];
  };

  massAssignment?: {
    /** Campos sensíveis que não devem ser aceitos: { campo: valorMalicioso } */
    camposSensiveis: Record<string, any>;
    /** Status esperado (normalmente CREATED ou OK — aceita mas ignora) */
    statusEsperado: number | number[];
    /** Função para validar que o campo sensível NÃO foi aplicado */
    validar: (body: any) => void | Promise<void>;
  };

  concorrencia?: {
    /** Campo com unique constraint */
    campoUnico: string;
    /** Gera valor único para o campo */
    valorUnico: () => string;
    /** Status esperado para duplicatas */
    statusConflito: number;
    /** Número de requests simultâneas (default: 5) */
    requests?: number;
    /** Cleanup do registro criado */
    cleanup?: (valor: string) => Promise<void>;
  };

  stacktrace?: {
    /** Payload que força um erro (campos inválidos/null) */
    payloadQueForcaErro: Record<string, any>;
  };
}

// ---- Helpers internos ----

async function makeRequest(
  request: APIRequestContext,
  method: HttpMethod,
  url: string,
  payload: Record<string, any> | undefined,
  headers?: Record<string, string>,
): Promise<any> {
  const m = method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete';
  const options: any = {};
  if (headers) options.headers = headers;
  if (payload && ['post', 'patch', 'put'].includes(m)) options.data = payload;
  return request[m](url, options);
}

function statusMatch(actual: number, expected: number | number[]): boolean {
  if (Array.isArray(expected)) return expected.includes(actual);
  return actual === expected;
}

// ---- Template principal ----

export function describeSecuritySuite(
  t: typeof test,
  params: SecuritySuiteParams,
): void {
  let seedData: Record<string, any> = {};
  let resolvedRoute = params.route;

  t.describe(params.descricao, () => {
    let testIndex = 0;
    const nextIndex = () => String(++testIndex).padStart(2, '0');

    t.beforeAll(async () => {
      if (params.seed) {
        const result = await params.seed();
        if (result && typeof result === 'object') {
          seedData = result;
        }
      }
      if (params.routeResolver) {
        resolvedRoute = params.routeResolver(seedData);
      }
    });

    if (params.cleanup) {
      t.afterAll(async () => {
        await params.cleanup!();
      });
    }

    // ---- SQL Injection ----
    if (params.sqlInjection) {
      t.describe('SQL Injection', () => {
        const payloads = [
          { label: "' OR 1=1 --", value: ATTACK.SQL_OR },
          { label: "DROP TABLE", value: ATTACK.SQL_DROP },
          { label: "UNION SELECT", value: ATTACK.SQL_UNION },
          { label: "comment injection", value: ATTACK.SQL_COMMENT },
        ];

        for (const campo of params.sqlInjection!.campos) {
          for (const [i, payload] of payloads.entries()) {
            const name = `#${nextIndex()} ${campo} com payload SQL (${payload.label}) não deve retornar 500`;

            t(name, async ({ request }) => {
              const url = `${BASE_URL}${resolvedRoute}`;
              const data = { ...params.basePayload, [campo]: payload.value };

              let headers: Record<string, string> | undefined;
              if (params.usuario) {
                headers = await setHeaders(request, params.usuario, { silent: true });
              }

              const response = await makeRequest(request, params.method, url, data, headers);

              await test.step('Não deve retornar 500 (erro interno)', async () => {
                expect(response.status()).not.toBe(HTTP.SERVER_ERROR);
              });

              await test.step('Deve retornar status de erro controlado', async () => {
                expect(statusMatch(response.status(), params.sqlInjection!.statusEsperado)).toBe(true);
              });

              await test.step('Não deve expor stacktrace na resposta', async () => {
                const body = await response.json().catch(() => ({}));
                const bodyStr = JSON.stringify(body);
                expect(bodyStr).not.toContain('at /');
                expect(bodyStr).not.toContain('.ts:');
                expect(bodyStr).not.toContain('.js:');
                expect(bodyStr).not.toContain('PrismaClient');
                expect(bodyStr).not.toContain('SQLSTATE');
                assertSemMensagemNaoTratada(bodyStr);
              });

              try {
                await logRequestResponse(params.method, url, data, headers, response);
              } catch { /* ignora */ }
            });
          }
        }
      });
    }

    // ---- XSS ----
    if (params.xss) {
      t.describe('XSS', () => {
        const payloads = [
          { label: '<script>alert(1)</script>', value: ATTACK.XSS_SCRIPT },
          { label: '<img onerror>', value: ATTACK.XSS_IMG },
          { label: 'event handler injection', value: ATTACK.XSS_EVENT },
        ];

        for (const campo of params.xss!.campos) {
          for (const payload of payloads) {
            const name = `#${nextIndex()} ${campo} com payload XSS (${payload.label}) deve ser tratado`;

            t(name, async ({ request }) => {
              const url = `${BASE_URL}${resolvedRoute}`;
              const data = { ...params.basePayload, [campo]: payload.value };

              let headers: Record<string, string> | undefined;
              if (params.usuario) {
                headers = await setHeaders(request, params.usuario, { silent: true });
              }

              const response = await makeRequest(request, params.method, url, data, headers);

              await test.step('Não deve retornar 500', async () => {
                expect(response.status()).not.toBe(HTTP.SERVER_ERROR);
              });

              await test.step('Se aceito, deve sanitizar ou armazenar como texto puro', async () => {
                const body = await response.json().catch(() => ({}));
                const bodyStr = JSON.stringify(body);
                // Se o backend aceita e retorna o valor, não deve conter tags HTML executáveis
                if (response.status() < 400 && bodyStr.includes(campo)) {
                  // Aceita: valor escapado ou armazenado como string (API JSON não executa XSS)
                  // Rejeita: se por algum motivo retornar Content-Type text/html
                  const contentType = response.headers()['content-type'] || '';
                  expect(contentType).toContain('application/json');
                }
              });

              try {
                await logRequestResponse(params.method, url, data, headers, response);
              } catch { /* ignora */ }
            });
          }
        }
      });
    }

    // ---- Mass Assignment ----
    if (params.massAssignment) {
      t.describe('Mass Assignment', () => {
        for (const [campo, valorMalicioso] of Object.entries(params.massAssignment!.camposSensiveis)) {
          const name = `#${nextIndex()} Campo sensível "${campo}" não deve ser aceito via payload`;

          t(name, async ({ request }) => {
            const url = `${BASE_URL}${resolvedRoute}`;
            const data = { ...params.basePayload, [campo]: valorMalicioso };

            let headers: Record<string, string> | undefined;
            if (params.usuario) {
              headers = await setHeaders(request, params.usuario, { silent: true });
            }

            const response = await makeRequest(request, params.method, url, data, headers);

            await test.step(`Deve retornar status esperado (${params.massAssignment!.statusEsperado})`, async () => {
              expect(statusMatch(response.status(), params.massAssignment!.statusEsperado)).toBe(true);
            });

            let responseBody: any = null;

            await test.step(`Campo "${campo}" não deve ter valor malicioso aplicado`, async () => {
              if (response.status() >= 200 && response.status() < 300) {
                responseBody = await response.json().catch(() => ({}));
                await params.massAssignment!.validar(responseBody);
              }
            });

            await test.step('Não deve conter mensagens não tratadas', async () => {
              const bodyStr = responseBody
                ? JSON.stringify(responseBody)
                : JSON.stringify(await response.json().catch(() => ({})));
              await assertSemMensagemNaoTratada(bodyStr);
            });

            try {
              await logRequestResponse(params.method, url, data, headers, response);
            } catch { /* ignora */ }
          });
        }
      });
    }

    // ---- Concorrência (Race Condition) ----
    if (params.concorrencia) {
      t.describe('Concorrência', () => {
        const name = `#${nextIndex()} ${params.concorrencia!.requests || 5} requests simultâneas com mesmo ${params.concorrencia!.campoUnico} — apenas 1 deve ser criada`;

        t(name, async ({ request }) => {
          const url = `${BASE_URL}${resolvedRoute}`;
          const valorUnico = params.concorrencia!.valorUnico();
          const numRequests = params.concorrencia!.requests || 5;

          const data = {
            ...params.basePayload,
            [params.concorrencia!.campoUnico]: valorUnico,
          };

          let headers: Record<string, string> | undefined;
          if (params.usuario) {
            headers = await setHeaders(request, params.usuario, { silent: true });
          }

          // Dispara N requests simultâneas
          const promises = Array.from({ length: numRequests }, () =>
            makeRequest(request, params.method, url, data, headers),
          );

          const responses = await Promise.all(promises);
          const statuses = responses.map((r: any) => r.status());

          await test.step('Deve ter exatamente 1 resposta de sucesso (201)', async () => {
            const successCount = statuses.filter(
              (s: number) => s >= 200 && s < 300,
            ).length;
            expect(successCount).toBe(1);
          });

          await test.step(`Demais devem retornar ${params.concorrencia!.statusConflito} (conflito)`, async () => {
            const conflictCount = statuses.filter(
              (s: number) => s === params.concorrencia!.statusConflito,
            ).length;
            expect(conflictCount).toBe(numRequests - 1);
          });

          await test.step('Nenhuma deve retornar 500', async () => {
            const serverErrors = statuses.filter((s: number) => s >= 500);
            expect(serverErrors.length).toBe(0);
          });

          // Cleanup
          if (params.concorrencia!.cleanup) {
            await params.concorrencia!.cleanup(valorUnico);
          }
        });
      });
    }

    // ---- Stacktrace Leak ----
    if (params.stacktrace) {
      t.describe('Stacktrace Leak', () => {
        const name = `#${nextIndex()} Erro não deve expor stacktrace ou internals na resposta`;

        t(name, async ({ request }) => {
          const url = `${BASE_URL}${resolvedRoute}`;
          const data = params.stacktrace!.payloadQueForcaErro;

          let headers: Record<string, string> | undefined;
          if (params.usuario) {
            headers = await setHeaders(request, params.usuario, { silent: true });
          }

          const response = await makeRequest(request, params.method, url, data, headers);
          const body = await response.json().catch(() => ({}));
          const bodyStr = JSON.stringify(body);

          await test.step('Não deve retornar 500', async () => {
            expect(response.status()).not.toBe(HTTP.SERVER_ERROR);
          });

          await test.step('Não deve conter stacktrace', async () => {
            expect(bodyStr).not.toMatch(/at\s+\S+\.(ts|js):\d+/);
            expect(bodyStr).not.toContain('node_modules');
            expect(bodyStr).not.toContain('internal/');
          });

          await test.step('Não deve expor nomes de tabelas ou queries', async () => {
            expect(bodyStr).not.toContain('PrismaClient');
            expect(bodyStr).not.toContain('SQLSTATE');
            expect(bodyStr).not.toContain('relation "');
          });

          await test.step('Não deve conter mensagens não tratadas do framework', async () => {
            assertSemMensagemNaoTratada(bodyStr);
          });

          try {
            await logRequestResponse(params.method, url, data, headers, response);
          } catch { /* ignora */ }
        });
      });
    }
  });
}

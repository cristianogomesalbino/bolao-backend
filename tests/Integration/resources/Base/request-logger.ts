// ============================================================
// REQUEST LOGGER — Anexa request/response ao relatório Allure
// ============================================================

import { APIResponse, test } from '@playwright/test';

/**
 * Loga request e response como attachments no relatório.
 * Usa test.info().attach() do Playwright — o allure-playwright captura automaticamente.
 */
export async function logRequestResponse(
  method: string,
  url: string,
  body: any,
  headers: Record<string, string> | undefined,
  response: APIResponse,
): Promise<void> {
  try {
    const testInfo = test.info();

    // Request
    const requestInfo = {
      method,
      url,
      headers: sanitizeHeaders(headers),
      body: body ?? null,
    };

    await testInfo.attach(`Request: ${method} ${extractPath(url)}`, {
      body: JSON.stringify(requestInfo, null, 2),
      contentType: 'application/json',
    });

    // Response
    let responseBody: any;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text();
    }

    const responseInfo = {
      status: response.status(),
      statusText: response.statusText(),
      body: responseBody,
    };

    await testInfo.attach(
      `Response: ${response.status()} ${response.statusText()}`,
      {
        body: JSON.stringify(responseInfo, null, 2),
        contentType: 'application/json',
      },
    );
  } catch (error) {
    // Não falhar o teste por causa de log
    console.warn('[RequestLogger] Erro ao logar request/response:', error);
  }
}

function sanitizeHeaders(
  headers?: Record<string, string>,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  const sanitized = { ...headers };
  if (sanitized.Authorization) {
    sanitized.Authorization = sanitized.Authorization.substring(0, 20) + '...';
  }
  return sanitized;
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

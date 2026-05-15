// ============================================================
// AUTENTICAÇÃO — equivalente ao Get Token / Generate Header
// ============================================================

import { APIRequestContext, test } from '@playwright/test';
import { BASE_URL, EMAIL_UNAUTHORIZED } from './constants';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getTokenAuthenticate(
  request: APIRequestContext,
  user: { email: string; senha: string },
): Promise<AuthTokens> {
  const response = await request.post(`${BASE_URL}auth/login`, {
    data: { email: user.email, senha: user.senha },
  });
  return response.json();
}

export async function generateHeaderAuthorization(
  request: APIRequestContext,
  user: { email: string; senha: string },
  options?: { silent?: boolean },
): Promise<Record<string, string>> {
  const tokens = await getTokenAuthenticate(request, user);

  if (!options?.silent) {
    try {
      test.info().attach('Usuário autenticado', {
        body: JSON.stringify({ email: user.email }, null, 2),
        contentType: 'application/json',
      });
    } catch {
      /* ignora fora de contexto de teste */
    }
  }

  return { Authorization: `Bearer ${tokens.accessToken}` };
}

export async function setHeaders(
  request: APIRequestContext,
  user: { email: string; senha: string },
  options?: { silent?: boolean },
): Promise<Record<string, string>> {
  if (user.email === EMAIL_UNAUTHORIZED) {
    if (!options?.silent) {
      try {
        test.info().attach('Usuário autenticado', {
          body: JSON.stringify(
            { email: user.email, nota: 'SEM TOKEN (unauthorized)' },
            null,
            2,
          ),
          contentType: 'application/json',
        });
      } catch {
        /* ignora */
      }
    }
    return { Authorization: '' };
  }
  return generateHeaderAuthorization(request, user, options);
}

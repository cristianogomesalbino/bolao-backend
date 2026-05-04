// ============================================================
// AUTENTICAÇÃO — equivalente ao Get Token / Generate Header
// ============================================================

import { APIRequestContext } from '@playwright/test';
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
): Promise<Record<string, string>> {
  const tokens = await getTokenAuthenticate(request, user);
  return { Authorization: `Bearer ${tokens.accessToken}` };
}

export async function setHeaders(
  request: APIRequestContext,
  user: { email: string; senha: string },
): Promise<Record<string, string>> {
  if (user.email === EMAIL_UNAUTHORIZED) {
    return { Authorization: '' };
  }
  return generateHeaderAuthorization(request, user);
}

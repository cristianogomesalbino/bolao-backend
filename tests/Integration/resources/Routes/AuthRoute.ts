// ============================================================
// ROUTES — Auth
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { logRequestResponse } from '../Base/request-logger';

export async function postLogin(
  request: APIRequestContext,
  payload: { email: string; senha: string },
) {
  const url = `${BASE_URL}auth/login`;
  const response = await request.post(url, { data: payload });
  await logRequestResponse('POST', url, payload, undefined, response);
  return response;
}

export async function postRefresh(
  request: APIRequestContext,
  payload: { refreshToken: string },
) {
  const url = `${BASE_URL}auth/refresh`;
  const response = await request.post(url, { data: payload });
  await logRequestResponse('POST', url, payload, undefined, response);
  return response;
}

export async function postLogout(
  request: APIRequestContext,
  headers: Record<string, string>,
  payload: { refreshToken: string },
) {
  const url = `${BASE_URL}auth/logout`;
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function postEsqueciSenha(
  request: APIRequestContext,
  payload: { email: string },
) {
  const url = `${BASE_URL}auth/esqueci-senha`;
  const response = await request.post(url, { data: payload });
  await logRequestResponse('POST', url, payload, undefined, response);
  return response;
}

export async function postResetarSenha(
  request: APIRequestContext,
  payload: { token: string; novaSenha: string; confirmarSenha?: string },
) {
  const url = `${BASE_URL}auth/resetar-senha`;
  const response = await request.post(url, { data: payload });
  await logRequestResponse('POST', url, payload, undefined, response);
  return response;
}

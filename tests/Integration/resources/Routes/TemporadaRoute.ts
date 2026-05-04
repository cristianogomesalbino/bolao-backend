// ============================================================
// ROUTES — Temporada
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postTemporada(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  payload: any,
) {
  const url = `${BASE_URL}temporadas`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function getTemporadas(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
) {
  const url = `${BASE_URL}temporadas`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

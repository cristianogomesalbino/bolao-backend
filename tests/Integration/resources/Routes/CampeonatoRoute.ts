// ============================================================
// ROUTES — Campeonato
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postCampeonato(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  payload: any,
) {
  const url = `${BASE_URL}campeonatos`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function getCampeonatos(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
) {
  const url = `${BASE_URL}campeonatos`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

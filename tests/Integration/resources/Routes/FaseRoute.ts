// ============================================================
// ROUTES — Fase
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postFase(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  temporadaId: string,
  payload: any,
) {
  const url = `${BASE_URL}temporadas/${temporadaId}/fases`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function getFases(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  temporadaId: string,
) {
  const url = `${BASE_URL}temporadas/${temporadaId}/fases`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function getFaseById(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  faseId: string,
) {
  const url = `${BASE_URL}temporadas/placeholder/fases/${faseId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

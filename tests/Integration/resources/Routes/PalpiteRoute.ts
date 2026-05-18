// ============================================================
// ROUTES — Palpite
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postPalpite(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  jogoId: string,
  payload: any,
) {
  const url = `${BASE_URL}jogos/${jogoId}/palpites`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function patchPalpite(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  palpiteId: string,
  payload: any,
) {
  const url = `${BASE_URL}palpites/${palpiteId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers, data: payload });
  await logRequestResponse('PATCH', url, payload, headers, response);
  return response;
}

export async function deletePalpite(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  palpiteId: string,
) {
  const url = `${BASE_URL}palpites/${palpiteId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.delete(url, { headers });
  await logRequestResponse('DELETE', url, undefined, headers, response);
  return response;
}

export async function getMeuPalpite(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  jogoId: string,
) {
  const url = `${BASE_URL}jogos/${jogoId}/meu-palpite`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function getMeusPalpites(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  temporadaId?: string,
) {
  const query = temporadaId ? `?temporadaId=${temporadaId}` : '';
  const url = `${BASE_URL}meus-palpites${query}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

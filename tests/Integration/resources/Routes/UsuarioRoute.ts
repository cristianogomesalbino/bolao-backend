// ============================================================
// ROUTES — Usuario
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postUsuario(request: APIRequestContext, payload: any) {
  const url = `${BASE_URL}usuarios`;
  const response = await request.post(url, { data: payload });
  await logRequestResponse('POST', url, payload, undefined, response);
  return response;
}

export async function getUsuarioMe(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
) {
  const url = `${BASE_URL}usuarios/me`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function getUsuarioById(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  id: string,
) {
  const url = `${BASE_URL}usuarios/${id}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function patchUsuario(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  id: string,
  payload: any,
) {
  const url = `${BASE_URL}usuarios/${id}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers, data: payload });
  await logRequestResponse('PATCH', url, payload, headers, response);
  return response;
}

export async function deleteUsuario(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  id: string,
) {
  const url = `${BASE_URL}usuarios/${id}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.delete(url, { headers });
  await logRequestResponse('DELETE', url, undefined, headers, response);
  return response;
}

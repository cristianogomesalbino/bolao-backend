// ============================================================
// ROUTES — Grupo
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postGrupo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  payload: any,
) {
  const url = `${BASE_URL}grupos`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function getGrupos(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
) {
  const url = `${BASE_URL}grupos`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function getGrupoById(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function patchGrupo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  payload: any,
) {
  const url = `${BASE_URL}grupos/${grupoId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers, data: payload });
  await logRequestResponse('PATCH', url, payload, headers, response);
  return response;
}

export async function patchGrupoStatus(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  payload: { ativo: boolean },
) {
  const url = `${BASE_URL}grupos/${grupoId}/status`;
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers, data: payload });
  await logRequestResponse('PATCH', url, payload, headers, response);
  return response;
}

export async function deleteGrupo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.delete(url, { headers });
  await logRequestResponse('DELETE', url, undefined, headers, response);
  return response;
}

export async function patchRegenerarConvite(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/regenerar-convite`;
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers });
  await logRequestResponse('PATCH', url, undefined, headers, response);
  return response;
}

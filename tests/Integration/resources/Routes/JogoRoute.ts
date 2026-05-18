// ============================================================
// ROUTES — Jogo
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postJogo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  faseId: string,
  payload: any,
) {
  const url = `${BASE_URL}fases/${faseId}/jogos`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function getJogosByFase(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  faseId: string,
) {
  const url = `${BASE_URL}fases/${faseId}/jogos`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function getJogoById(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  jogoId: string,
) {
  const url = `${BASE_URL}jogos/${jogoId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function patchJogo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  jogoId: string,
  payload: any,
) {
  const url = `${BASE_URL}jogos/${jogoId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers, data: payload });
  await logRequestResponse('PATCH', url, payload, headers, response);
  return response;
}

export async function patchFinalizarJogo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  jogoId: string,
  payload: any,
) {
  const url = `${BASE_URL}jogos/${jogoId}/finalizar`;
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers, data: payload });
  await logRequestResponse('PATCH', url, payload, headers, response);
  return response;
}

export async function postImportarJogos(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  payload: any,
) {
  const url = `${BASE_URL}jogos/importar`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

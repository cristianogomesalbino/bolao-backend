// ============================================================
// ROUTES — PalpiteDobrado
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postAtivarDobro(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  jogoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/jogos/${jogoId}/dobro`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers });
  await logRequestResponse('POST', url, undefined, headers, response);
  return response;
}

export async function deleteDesativarDobro(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  jogoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/jogos/${jogoId}/dobro`;
  const headers = await setHeaders(request, usuario);
  const response = await request.delete(url, { headers });
  await logRequestResponse('DELETE', url, undefined, headers, response);
  return response;
}

export async function getSaldoTokens(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/tokens-dobro/saldo`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function getHistoricoTokens(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/tokens-dobro/historico`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function patchConfigurarDobro(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  payload: { permitirPalpiteDobrado: boolean },
) {
  const url = `${BASE_URL}grupos/${grupoId}/configuracao-dobro`;
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers, data: payload });
  await logRequestResponse('PATCH', url, payload, headers, response);
  return response;
}

export async function getMeusDobros(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/meus-dobros`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function getPainelRodada(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  faseId: string,
  rodada?: number,
) {
  let url = `${BASE_URL}grupos/${grupoId}/painel-rodada/${faseId}`;
  if (rodada !== undefined) url += `?rodada=${rodada}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

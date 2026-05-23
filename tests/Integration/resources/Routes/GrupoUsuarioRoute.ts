// ============================================================
// ROUTES — GrupoUsuario (Membros)
// ============================================================

import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postEntrarGrupo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  payload: { codigoConvite: string },
) {
  const url = `${BASE_URL}grupos/entrar`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function postAdicionarMembro(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  payload: { email: string },
) {
  const url = `${BASE_URL}grupos/${grupoId}/adicionar`;
  const headers = await setHeaders(request, usuario);
  const response = await request.post(url, { headers, data: payload });
  await logRequestResponse('POST', url, payload, headers, response);
  return response;
}

export async function getMembros(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/membros`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}

export async function deleteSairGrupo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/sair`;
  const headers = await setHeaders(request, usuario);
  const response = await request.delete(url, { headers });
  await logRequestResponse('DELETE', url, undefined, headers, response);
  return response;
}

export async function deleteRemoverMembro(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  usuarioId: string,
) {
  const url = `${BASE_URL}grupos/${grupoId}/usuarios/${usuarioId}`;
  const headers = await setHeaders(request, usuario);
  const response = await request.delete(url, { headers });
  await logRequestResponse('DELETE', url, undefined, headers, response);
  return response;
}

export async function patchAlterarCargo(
  request: APIRequestContext,
  usuario: { email: string; senha: string },
  grupoId: string,
  usuarioId: string,
  payload: { role: string },
  transferir = false,
) {
  let url = `${BASE_URL}grupos/${grupoId}/usuarios/${usuarioId}/cargo`;
  if (transferir) url += '?transferir=true';
  const headers = await setHeaders(request, usuario);
  const response = await request.patch(url, { headers, data: payload });
  await logRequestResponse('PATCH', url, payload, headers, response);
  return response;
}

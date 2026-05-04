// ============================================================
// SETUP COMPARTILHADO — Cria infraestrutura de grupo para AttemptRequests
// ============================================================

import { APIRequestContext } from '@playwright/test';
import * as CampeonatoRoute from '../../Routes/CampeonatoRoute';
import * as TemporadaRoute from '../../Routes/TemporadaRoute';
import * as GrupoRoute from '../../Routes/GrupoRoute';
import * as GrupoUsuarioRoute from '../../Routes/GrupoUsuarioRoute';

export interface GrupoAttemptSetupData {
  campeonatoId: string;
  temporadaId: string;
  grupoId: string;
  codigoConvite: string;
}

/**
 * Cria campeonato → temporada → grupo privado → membro entra.
 * Retorna IDs para uso nos cenários de AttemptRequests.
 */
export async function setupGrupoComMembros(
  request: APIRequestContext,
  adminUser: { email: string; senha: string },
  membroUser: { email: string; senha: string },
  sufixo: string,
): Promise<GrupoAttemptSetupData> {
  const campResp = await CampeonatoRoute.postCampeonato(request, adminUser, {
    nome: `Camp ${sufixo} ${Date.now()}`,
  });
  const campeonatoId = (await campResp.json()).id;

  const tempResp = await TemporadaRoute.postTemporada(request, adminUser, {
    ano: 2026,
    campeonatoId,
  });
  const temporadaId = (await tempResp.json()).id;

  const grupoResp = await GrupoRoute.postGrupo(request, adminUser, {
    nome: `Grupo ${sufixo} ${Date.now()}`,
    temporadaId,
    privado: true,
  });
  const grupoBody = await grupoResp.json();

  await GrupoUsuarioRoute.postEntrarGrupo(request, membroUser, {
    codigoConvite: grupoBody.codigoConvite,
  });

  return {
    campeonatoId,
    temporadaId,
    grupoId: grupoBody.id,
    codigoConvite: grupoBody.codigoConvite,
  };
}

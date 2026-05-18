// ============================================================
// DATABASE HELPER — Grupo
// ============================================================

import { SCHEMA } from './database';
import {
  executeDatabaseQuery,
  executeDatabaseSqlString,
  getQueryResultValue,
} from '../Base/api';

export async function selectGrupoByNome(nome: string): Promise<string | null> {
  const result = await executeDatabaseQuery(
    `SELECT id FROM ${SCHEMA.GRUPO} WHERE nome = $1`,
    [nome],
  );
  return getQueryResultValue(result);
}

export async function selectGrupoCodigoConvite(
  grupoId: string,
): Promise<string | null> {
  const result = await executeDatabaseQuery(
    `SELECT "codigoConvite" FROM ${SCHEMA.GRUPO} WHERE id = $1`,
    [grupoId],
  );
  return getQueryResultValue(result);
}

export async function selectGrupoById(
  grupoId: string,
): Promise<{ nome: string; privado: boolean; ativo: boolean; codigoConvite: string } | null> {
  const result = await executeDatabaseQuery(
    `SELECT "nome", "privado", "ativo", "codigoConvite" FROM ${SCHEMA.GRUPO} WHERE id = $1`,
    [grupoId],
  );
  return result && result.length > 0 ? result[0] : null;
}

export async function deleteGrupoByNome(nome: string): Promise<void> {
  const id = await selectGrupoByNome(nome);
  if (!id) return;

  await executeDatabaseSqlString(
    `DELETE FROM ${SCHEMA.GRUPO_USUARIO} WHERE "grupoId" = $1`,
    [id],
  );
  await executeDatabaseSqlString(
    `DELETE FROM ${SCHEMA.GRUPO} WHERE "id" = $1`,
    [id],
  );
}

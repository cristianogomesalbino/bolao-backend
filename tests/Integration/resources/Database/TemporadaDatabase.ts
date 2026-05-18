// ============================================================
// DATABASE HELPER — Temporada
// ============================================================

import { SCHEMA } from './database';
import {
  executeDatabaseQuery,
  executeDatabaseSqlString,
  getQueryResultValue,
} from '../Base/api';

export async function selectTemporadaByCampeonatoIdAndAno(
  campeonatoId: string,
  ano: number,
): Promise<string | null> {
  const result = await executeDatabaseQuery(
    `SELECT id FROM ${SCHEMA.TEMPORADA} WHERE "campeonatoId" = $1 AND "ano" = $2`,
    [campeonatoId, ano],
  );
  return getQueryResultValue(result);
}

export async function selectTemporadaById(
  id: string,
): Promise<{ ano: number; campeonatoId: string } | null> {
  const result = await executeDatabaseQuery(
    `SELECT "ano", "campeonatoId" FROM ${SCHEMA.TEMPORADA} WHERE id = $1`,
    [id],
  );
  return result && result.length > 0 ? result[0] : null;
}

export async function insertTemporada(
  campeonatoId: string,
  ano: number,
): Promise<void> {
  await executeDatabaseSqlString(
    `INSERT INTO ${SCHEMA.TEMPORADA}("id", "ano", "campeonatoId", "dataCriacao", "atualizadoEm")
     VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())`,
    [ano, campeonatoId],
  );
}

export async function deleteTemporadaByCampeonatoId(
  campeonatoId: string,
): Promise<void> {
  await executeDatabaseSqlString(
    `DELETE FROM ${SCHEMA.TEMPORADA} WHERE "campeonatoId" = $1`,
    [campeonatoId],
  );
}

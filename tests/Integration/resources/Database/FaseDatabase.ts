// ============================================================
// DATABASE HELPER — Fase
// ============================================================

import { SCHEMA } from './database';
import {
  executeDatabaseQuery,
  executeDatabaseSqlString,
  getQueryResultValue,
} from '../Base/api';

export async function selectFaseByTemporadaIdAndNome(
  temporadaId: string,
  nome: string,
): Promise<string | null> {
  const result = await executeDatabaseQuery(
    `SELECT id FROM ${SCHEMA.FASE} WHERE "temporadaId" = $1 AND "nome" = $2`,
    [temporadaId, nome],
  );
  return getQueryResultValue(result);
}

export async function selectFaseById(
  id: string,
): Promise<{ nome: string; tipo: string; ordem: number; idaVolta: boolean; temporadaId: string } | null> {
  const result = await executeDatabaseQuery(
    `SELECT "nome", "tipo", "ordem", "idaVolta", "temporadaId" FROM ${SCHEMA.FASE} WHERE id = $1`,
    [id],
  );
  return result && result.length > 0 ? result[0] : null;
}

export async function insertFase(
  temporadaId: string,
  nome: string,
  tipo: string,
  ordem: number,
  idaVolta: boolean = false,
): Promise<void> {
  await executeDatabaseSqlString(
    `INSERT INTO ${SCHEMA.FASE}("id", "nome", "tipo", "ordem", "idaVolta", "temporadaId", "dataCriacao", "atualizadoEm")
     VALUES (gen_random_uuid(), $1, $2::"TipoFase", $3, $4, $5, NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [nome, tipo, ordem, idaVolta, temporadaId],
  );
}

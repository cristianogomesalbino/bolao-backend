// ============================================================
// DATABASE HELPER — Campeonato
// ============================================================

import { SCHEMA } from './database';
import {
  executeDatabaseQuery,
  executeDatabaseSqlString,
  getQueryResultValue,
} from '../Base/api';

export async function selectCampeonatoByNome(
  nome: string,
): Promise<string | null> {
  const result = await executeDatabaseQuery(
    `SELECT id FROM ${SCHEMA.CAMPEONATO} WHERE nome = $1`,
    [nome],
  );
  return getQueryResultValue(result);
}

export async function selectCampeonatoById(
  id: string,
): Promise<{ nome: string } | null> {
  const result = await executeDatabaseQuery(
    `SELECT "nome" FROM ${SCHEMA.CAMPEONATO} WHERE id = $1`,
    [id],
  );
  return result && result.length > 0 ? result[0] : null;
}

export async function insertCampeonato(nome: string): Promise<void> {
  await executeDatabaseSqlString(
    `INSERT INTO ${SCHEMA.CAMPEONATO}("id", "nome", "dataCriacao", "atualizadoEm")
     VALUES (gen_random_uuid(), $1, NOW(), NOW())`,
    [nome],
  );
}

export async function deleteCampeonatoByNome(nome: string): Promise<void> {
  await executeDatabaseSqlString(
    `DELETE FROM ${SCHEMA.CAMPEONATO} WHERE "nome" = $1`,
    [nome],
  );
}

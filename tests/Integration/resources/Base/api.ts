// ============================================================
// CLIENTE HTTP BASE — equivalente ao API.robot keywords
// ============================================================

import { MINIMUM_RECORD } from './constants';
import { db } from '../Database/connection';

export async function executeDatabaseQuery(
  query: string,
  params?: any[],
): Promise<any[] | null> {
  const result = await db.query(query, params);
  if (result.rows.length >= MINIMUM_RECORD) {
    return result.rows;
  }
  return null;
}

export async function executeDatabaseSqlString(
  sql: string,
  params?: any[],
): Promise<void> {
  await db.query(sql, params);
}

export function getQueryResultValue(result: any[] | null): any {
  if (result && result.length > 0) {
    return Object.values(result[0])[0];
  }
  return null;
}

export function getQueryResults(results: any[] | null): any[] | null {
  if (results && results.length > 0) {
    return results.map((row) => Object.values(row)[0]);
  }
  return null;
}

export function setCurrentTestExecutionTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 15);
  return now.toISOString();
}

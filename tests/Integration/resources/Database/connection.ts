import { Pool } from 'pg';

const useSSL = process.env.DB_SSL === 'true';

export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

export async function connectDatabase(): Promise<void> {
  await db.query('SELECT 1');
}

export async function disconnectDatabase(): Promise<void> {
  await db.end();
}

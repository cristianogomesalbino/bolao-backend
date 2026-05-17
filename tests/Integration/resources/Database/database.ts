// ============================================================
// SCHEMA CONSTANTS + LIMPEZA — equivalente ao Database.robot
// ============================================================

import { db } from './connection';

// Tabelas do Prisma schema (public schema no Supabase)
export const SCHEMA = {
  PALPITE_DOBRADO: '"PalpiteDobrado"',
  TOKEN_DOBRO: '"TokenDobro"',
  PALPITE: '"Palpite"',
  JOGO: '"Jogo"',
  FASE: '"Fase"',
  GRUPO_USUARIO: '"GrupoUsuario"',
  GRUPO: '"Grupo"',
  REFRESH_TOKEN: '"RefreshToken"',
  RECUPERACAO_SENHA: '"RecuperacaoSenha"',
  TEMPORADA: '"Temporada"',
  CAMPEONATO: '"Campeonato"',
  USUARIO: '"Usuario"',
  TIME: '"Time"',
} as const;

/**
 * Limpa todos os dados de teste criados após o timestamp fornecido.
 * Respeita a ordem de foreign keys (deleta dependentes primeiro).
 */
export async function cleanTestsData(executionTime: string): Promise<void> {
  const queries = [
    // Ordem inversa de dependência — registros criados após o timestamp
    `DELETE FROM ${SCHEMA.TOKEN_DOBRO} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.PALPITE_DOBRADO} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.PALPITE} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.JOGO} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.FASE} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.GRUPO_USUARIO} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.GRUPO} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.REFRESH_TOKEN} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.RECUPERACAO_SENHA} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.TEMPORADA} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.CAMPEONATO} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.USUARIO} WHERE "dataCriacao" >= $1`,
    `DELETE FROM ${SCHEMA.TIME} WHERE "dataCriacao" >= $1`,
  ];

  for (const query of queries) {
    try {
      await db.query(query, [executionTime]);
    } catch (error) {
      console.warn(`Aviso ao limpar dados: ${error}`);
    }
  }

  // Limpa usuários de seed que podem ter sido criados via ON CONFLICT (dataCriacao antiga)
  try {
    await db.query(
      `DELETE FROM ${SCHEMA.REFRESH_TOKEN} WHERE "usuarioId" IN (SELECT id FROM ${SCHEMA.USUARIO} WHERE email LIKE '%.qa' OR email LIKE '%.qa.bolao')`,
    );
    await db.query(
      `DELETE FROM ${SCHEMA.RECUPERACAO_SENHA} WHERE "usuarioId" IN (SELECT id FROM ${SCHEMA.USUARIO} WHERE email LIKE '%.qa' OR email LIKE '%.qa.bolao')`,
    );
    await db.query(
      `DELETE FROM ${SCHEMA.GRUPO_USUARIO} WHERE "usuarioId" IN (SELECT id FROM ${SCHEMA.USUARIO} WHERE email LIKE '%.qa' OR email LIKE '%.qa.bolao')`,
    );
    await db.query(
      `DELETE FROM ${SCHEMA.USUARIO} WHERE email LIKE '%.qa' OR email LIKE '%.qa.bolao'`,
    );
  } catch (error) {
    console.warn(`Aviso ao limpar usuários de seed: ${error}`);
  }
}

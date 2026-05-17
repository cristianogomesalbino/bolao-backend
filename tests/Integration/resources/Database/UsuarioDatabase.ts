// ============================================================
// DATABASE HELPER — Usuario
// ============================================================

import { SCHEMA } from './database';
import {
  executeDatabaseQuery,
  executeDatabaseSqlString,
  getQueryResultValue,
} from '../Base/api';
import bcryptjs from 'bcryptjs';

export async function selectUsuarioByEmail(
  email: string,
): Promise<string | null> {
  const result = await executeDatabaseQuery(
    `SELECT id FROM ${SCHEMA.USUARIO} WHERE email = $1`,
    [email],
  );
  return getQueryResultValue(result);
}

export async function selectUsuarioById(
  id: string,
): Promise<{ nome: string; email: string; perfil: string; ativo: boolean } | null> {
  const result = await executeDatabaseQuery(
    `SELECT "nome", "email", "perfil", "ativo" FROM ${SCHEMA.USUARIO} WHERE id = $1`,
    [id],
  );
  return result && result.length > 0 ? result[0] : null;
}

export async function insertUsuario(usuario: {
  nome: string;
  email: string;
  senha: string;
  perfil?: string;
  ativo?: boolean;
}): Promise<void> {
  const hashedPass = bcryptjs.hashSync(usuario.senha, 10);
  const perfil = usuario.perfil ?? 'USER';
  const ativo = usuario.ativo ?? true;
  await executeDatabaseSqlString(
    `INSERT INTO ${SCHEMA.USUARIO}("id", "nome", "email", "senha", "perfil", "ativo", "dataCriacao", "atualizadoEm")
     VALUES (gen_random_uuid(), $1, $2, $3, $4::"Perfil", $5, NOW(), NOW())
     ON CONFLICT ("email") DO UPDATE SET "senha" = $3, "perfil" = $4::"Perfil", "ativo" = $5, "atualizadoEm" = NOW()`,
    [usuario.nome, usuario.email, hashedPass, perfil, ativo],
  );
}

export async function deleteUsuarioByEmail(email: string): Promise<void> {
  // Limpa dependências antes
  const id = await selectUsuarioByEmail(email);
  if (!id) return;

  await executeDatabaseSqlString(
    `DELETE FROM ${SCHEMA.REFRESH_TOKEN} WHERE "usuarioId" = $1`,
    [id],
  );
  await executeDatabaseSqlString(
    `DELETE FROM ${SCHEMA.RECUPERACAO_SENHA} WHERE "usuarioId" = $1`,
    [id],
  );
  await executeDatabaseSqlString(
    `DELETE FROM ${SCHEMA.GRUPO_USUARIO} WHERE "usuarioId" = $1`,
    [id],
  );
  await executeDatabaseSqlString(
    `DELETE FROM ${SCHEMA.USUARIO} WHERE "id" = $1`,
    [id],
  );
}

export async function createUsuario(data: {
  nome: string;
  email: string;
  senha: string;
  perfil?: string;
  ativo?: boolean;
}): Promise<void> {
  await insertUsuario(data);
}

export async function createUsuarios(
  dataList: Array<{
    nome: string;
    email: string;
    senha: string;
    perfil?: string;
    ativo?: boolean;
  }>,
): Promise<void> {
  for (const data of dataList) {
    await createUsuario(data);
  }
}

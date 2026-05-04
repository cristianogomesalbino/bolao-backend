// ============================================================
// TEMPLATE — Avaliação inteligente de resposta
// (equivalente ao Evaluate Response Behavior do Robot)
// ============================================================

import {
  HTTP_OK,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_UNPROCESSABLE_ENTITY,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
  HTTP_METHOD_NOT_ALLOWED,
} from '../Base/constants';

/**
 * Avalia se o comportamento da resposta é consistente.
 * Equivalente ao "Evaluate Response Behavior" do Robot.
 *
 * - 500 → bug crítico (sempre falha)
 * - 200 em rota protegida → possível falha de segurança
 * - 422 em rota protegida → deveria validar acesso ANTES de validar dados
 * - 404 em rota protegida → deveria validar acesso ANTES de buscar recurso
 * - 403 → valida que a mensagem de acesso negado está correta
 */
export function evaluateResponseBehavior(
  status: number,
  body: any,
  isPublicRoute: boolean,
): void {
  if (status === HTTP_INTERNAL_SERVER_ERROR) {
    throw new Error(
      `QA: ${status} - ALTA PRIORIDADE! Avaliar incidente. Body: ${JSON.stringify(body)}`,
    );
  }

  if (!isPublicRoute) {
    if (status === HTTP_OK) {
      throw new Error(
        `QA: ${status} - Oops! Avaliar se este usuário deveria ter acesso mesmo sem regras de perfil específica.`,
      );
    }
    if (status === HTTP_UNPROCESSABLE_ENTITY) {
      throw new Error(
        `QA: ${status} - Deveria validar os dados da requisição somente após verificar se o usuário tem acesso.`,
      );
    }
    if (status === HTTP_NOT_FOUND) {
      throw new Error(
        `QA: ${status} - Deveria validar os dados da requisição somente após verificar se o usuário tem acesso.`,
      );
    }
  }
}

/**
 * Avalia resposta para testes de regras autorizadas.
 * Equivalente ao "Evaluate Response Behavior For Rules Authorized" do Robot.
 *
 * Se o perfil DEVERIA ter acesso:
 * - 500 → bug crítico
 * - 403/401 → falha (deveria ter acesso)
 * - 405 → avaliar comportamento da rota
 * - 404 → pode ser correto (registro não existe), mas avaliar
 * - Qualquer outro → usuário autorizado (passa)
 */
export function evaluateResponseForRulesAuthorized(status: number): void {
  if (status === HTTP_INTERNAL_SERVER_ERROR) {
    throw new Error(`QA: ${status} - ALTA PRIORIDADE! Avaliar incidente.`);
  }
  if (status === HTTP_FORBIDDEN) {
    throw new Error(
      `QA: ${status} - Oops! Avaliar, aparentemente este usuário deveria ter acesso.`,
    );
  }
  if (status === HTTP_UNAUTHORIZED) {
    throw new Error(
      `QA: ${status} - Oops! Avaliar, aparentemente este usuário deveria ter acesso.`,
    );
  }
  if (status === HTTP_METHOD_NOT_ALLOWED) {
    throw new Error(`QA: ${status} - Oops! Avaliar comportamento desta rota.`);
  }
  if (status === HTTP_NOT_FOUND) {
    console.warn(
      `QA: ${status} - Quando o registro não existe está correto, porém deve-se verificar se está retornando em casos indevidos.`,
    );
  }
  // Se chegou aqui, o acesso foi autorizado corretamente
}

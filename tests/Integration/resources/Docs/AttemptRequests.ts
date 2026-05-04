/**
 * PADRÕES DE RESPOSTA PARA REQUISIÇÕES À API — Bolão Backend
 *
 * Cenário 01 - HTTP_UNAUTHORIZED (401):
 *   Dado usuário sem token de autenticação
 *   Quando realiza requisição para rota protegida
 *   Então deve responder HTTP_UNAUTHORIZED (401)
 *
 * Cenário 02 - HTTP_FORBIDDEN (403):
 *   Dado usuário autenticado sem permissão (ex: USER tentando rota SUPER_ADMIN)
 *   Quando realiza requisição para rota restrita
 *   Então deve responder HTTP_FORBIDDEN (403)
 *
 * Cenário 03 - HTTP_NOT_FOUND (404):
 *   Dado usuário autorizado
 *   Quando passa UUID de recurso inexistente
 *   Então deve responder HTTP_NOT_FOUND (404)
 *
 * Cenário 04 - HTTP_CONFLICT (409):
 *   Dado usuário autorizado
 *   Quando tenta criar recurso duplicado (ex: email já cadastrado, já está no grupo)
 *   Então deve responder HTTP_CONFLICT (409)
 *
 * Cenário 05 - HTTP_BAD_REQUEST (400):
 *   Dado usuário autorizado
 *   Quando envia payload com dados inválidos ou viola regra de negócio
 *   Então deve responder HTTP_BAD_REQUEST (400)
 *
 * Cenário 06 - HTTP_UNPROCESSABLE_ENTITY (422):
 *   Dado usuário autorizado
 *   Quando envia payload faltando campos obrigatórios ou com tipos incorretos
 *   Então deve responder HTTP_UNPROCESSABLE_ENTITY (422)
 *
 * Cenário 07 - Validações de UUID:
 *   Dado qualquer usuário
 *   Quando passa UUID inválido como parâmetro
 *   Então deve responder HTTP_BAD_REQUEST (400) com mensagem de validação
 *
 * Cenário 08 - Guards de Grupo:
 *   Dado usuário autenticado que NÃO pertence ao grupo
 *   Quando tenta acessar rota protegida por GroupRoleGuard
 *   Então deve responder HTTP_FORBIDDEN (403) com "Usuário não pertence a este grupo"
 *
 * Cenário 09 - Guards de Grupo (role insuficiente):
 *   Dado MEMBER tentando rota que exige ADMIN
 *   Quando tenta executar ação administrativa no grupo
 *   Então deve responder HTTP_FORBIDDEN (403) com "Sem permissão neste grupo"
 */

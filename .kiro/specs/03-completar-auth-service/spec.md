# Feature: Completar Auth Service

## Problema

O `auth.service.ts` está vazio ou incompleto. A lógica de autenticação (login, refresh token, logout) pode estar espalhada ou ausente.

## Objetivo

Garantir que o `AuthService` contenha toda a lógica de autenticação de forma coesa: login com validação de credenciais, geração de tokens JWT, refresh token e logout (invalidação de refresh token).

## Requisitos

### Requisito 1: Login
- Validar email e senha do usuário
- Usar bcrypt para comparar senha
- Gerar access token (JWT, 15min) e refresh token (7d)
- Salvar refresh token no banco (modelo RefreshToken)
- Retornar ambos os tokens

### Requisito 2: Refresh Token
- Validar refresh token recebido
- Verificar se existe no banco e não está expirado
- Gerar novo par de tokens (rotação de refresh token)
- Invalidar o refresh token anterior
- Retornar novos tokens

### Requisito 3: Logout
- Receber refresh token
- Invalidar (deletar) o refresh token do banco
- Retornar confirmação

### Requisito 4: Segurança
- Não expor detalhes sobre qual campo falhou no login (email vs senha)
- Verificar se o usuário está ativo (`ativo: true`) antes de autenticar
- Limpar refresh tokens expirados quando possível

### Requisito 5: Testes
- Testes unitários para login (sucesso, usuário não encontrado, senha incorreta, usuário inativo)
- Testes unitários para refresh (sucesso, token inválido, token expirado)
- Testes unitários para logout (sucesso, token não encontrado)

## Tarefas

- [ ] Auditar o estado atual do auth.service.ts e auth.controller.ts
- [ ] Implementar método login no AuthService
- [ ] Implementar método refreshToken no AuthService
- [ ] Implementar método logout no AuthService
- [ ] Garantir que o controller delega corretamente para o service
- [ ] Criar/atualizar testes unitários do AuthService
- [ ] Verificar integração com JwtStrategy e guards existentes
- [ ] Atualizar postman_collection.json se necessário

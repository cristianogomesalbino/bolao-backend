# Plano de Implementação: Guards Globais (APP_GUARD)

## Visão Geral

Transformar a autenticação JWT de opt-in para opt-out: registrar `JwtAuthGuard` como guard global, criar decorator `@Public()` para rotas públicas, e remover `@UseGuards(JwtAuthGuard)` manuais dos controllers.

## Tasks

- [x] 1. Criar decorator @Public() e atualizar JwtAuthGuard
  - [x] 1.1 Criar o decorator `@Public()` em `src/common/decorators/public.decorator.ts`
    - Exportar constante `IS_PUBLIC_KEY` e função `Public` usando `SetMetadata`
    - _Requisitos: 1.1, 1.2, 1.3_

  - [x] 1.2 Atualizar `JwtAuthGuard` em `src/modules/auth/jwt-auth.guard.ts`
    - Injetar `Reflector` via constructor
    - Sobrescrever `canActivate` para ler metadata `isPublic` com `getAllAndOverride`
    - Se `isPublic` for `true`, retornar `true` sem validar token
    - Caso contrário, delegar para `super.canActivate(context)`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.3 Escrever teste de propriedade para @Public() (Propriedade 1)
    - **Propriedade 1: @Public() define metadata isPublic**
    - Gerar handlers com e sem `@Public()`, verificar retorno do `Reflector`
    - **Valida: Requisitos 1.1, 1.2**

  - [ ]* 1.4 Escrever testes de propriedade para JwtAuthGuard (Propriedades 2 e 3)
    - **Propriedade 2: Rotas públicas permitem acesso sem token**
    - Gerar `ExecutionContext` mocks com `isPublic=true`, verificar que `canActivate` retorna `true`
    - **Propriedade 3: Rotas não-públicas delegam para validação JWT**
    - Gerar `ExecutionContext` mocks com `isPublic=false/undefined`, verificar delegação para `super.canActivate`
    - **Valida: Requisitos 2.1, 2.2, 3.2, 4.5**

- [x] 2. Checkpoint — Verificar decorator e guard
  - Garantir que os testes passam, perguntar ao usuário se há dúvidas.

- [x] 3. Registrar guard global e marcar rotas públicas
  - [x] 3.1 Registrar `JwtAuthGuard` como `APP_GUARD` no `AppModule`
    - Adicionar provider `{ provide: APP_GUARD, useClass: JwtAuthGuard }` em `src/app.module.ts`
    - Manter imports de módulos existentes inalterados
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 3.2 Marcar rotas públicas com `@Public()` no `AuthController`
    - Adicionar `@Public()` em `POST /auth/login` e `POST /auth/refresh`
    - **Não** marcar `POST /auth/logout` (deve continuar protegida)
    - _Requisitos: 4.1, 4.2, 6.1_

  - [x] 3.3 Marcar rota pública com `@Public()` no `UsuariosController`
    - Adicionar `@Public()` em `POST /usuarios` (criação de conta)
    - _Requisitos: 4.3_

  - [x] 3.4 Marcar rota pública com `@Public()` no `AppController`
    - Adicionar `@Public()` em `GET /health`
    - _Requisitos: 4.4_

- [x] 4. Remover @UseGuards(JwtAuthGuard) manuais dos controllers
  - [x] 4.1 Remover `@UseGuards(JwtAuthGuard)` de nível de classe em `CampeonatosController`
    - Remover decorator e import não utilizado de `JwtAuthGuard`
    - _Requisitos: 5.1_

  - [x] 4.2 Remover `@UseGuards(JwtAuthGuard)` de nível de classe em `TemporadasController`
    - Remover decorator e import não utilizado de `JwtAuthGuard`
    - _Requisitos: 5.2_

  - [x] 4.3 Remover `@UseGuards(JwtAuthGuard)` de nível de classe em `GruposController`
    - Remover decorator e import não utilizado de `JwtAuthGuard`
    - _Requisitos: 5.3_

  - [x] 4.4 Remover `@UseGuards(JwtAuthGuard)` de nível de classe em `GrupoUsuarioController`
    - Remover decorator e import não utilizado de `JwtAuthGuard`
    - _Requisitos: 5.4_

  - [x] 4.5 Remover `JwtAuthGuard` dos `@UseGuards` de método em `UsuariosController`
    - Remover `@UseGuards(JwtAuthGuard)` de `GET /me`
    - Alterar `@UseGuards(JwtAuthGuard, SelfOrAdminGuard)` para `@UseGuards(SelfOrAdminGuard)` em `GET /:id`, `PATCH /:id`, `DELETE /:id`
    - Manter `SelfOrAdminGuard` inalterado
    - _Requisitos: 5.5, 5.6_

- [x] 5. Checkpoint — Verificar remoções e guards mantidos
  - Garantir que os testes passam, perguntar ao usuário se há dúvidas.

- [ ] 6. Testes finais e validação
  - [ ]* 6.1 Escrever testes unitários de validação
    - Verificar que `login`, `refresh`, `criarUsuario` e `health` têm metadata `isPublic=true`
    - Verificar que `logout` **não** tem metadata `isPublic`
    - Verificar que `AppModule` registra `APP_GUARD` com `JwtAuthGuard`
    - Verificar que rotas com `GroupRoleGuard` e `SelfOrAdminGuard` mantêm esses guards
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 5.6, 5.7, 6.1, 6.2_

- [x] 7. Checkpoint final
  - Garantir que todos os testes passam, perguntar ao usuário se há dúvidas.

## Notas

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Guards de autorização (`GroupRoleGuard`, `SelfOrAdminGuard`) não são alterados

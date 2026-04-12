---
inclusion: always
---

# Convenções de Código

## Padrões de Erro

Sempre usar `ErrorFactory` de `src/common/errors/error.factory.ts` para lançar exceções:

```typescript
throw ErrorFactory.notFound('Recurso não encontrado');
throw ErrorFactory.badRequest('Dados inválidos');
throw ErrorFactory.conflict('Registro já existe');
throw ErrorFactory.forbidden('Sem permissão');
throw ErrorFactory.unauthorized('Não autenticado');
```

Formato padrão de resposta de erro:
```json
{
  "erros": [
    {
      "campo": "nomeDoCampo",
      "mensagens": ["Mensagem de erro"]
    }
  ]
}
```

Não usar `"campo": "geral"`. O campo `campo` é opcional — omitir quando não se aplica a um campo específico.

## Arquitetura

- Services NÃO devem conter lógica de autorização
- Autorização sempre via Guards (JwtAuthGuard, GroupRoleGuard, SelfOrAdminGuard)
- Não duplicar regras de negócio
- Usar transação Prisma (`$transaction`) quando necessário (ex: criar grupo + adicionar admin)

## DTOs

- Usar `class-validator` para validação (`@IsUUID`, `@IsString`, `@IsOptional`, etc.)
- Usar `@ApiProperty` / `@ApiPropertyOptional` do Swagger em todos os campos
- Validação de UUID em params via `ParseUUIDCustomPipe`
- Mensagens de validação sempre em português brasileiro via parâmetro `message` dos decorators (ex: `@IsString({ message: 'nome deve ser uma string' })`)

## Autenticação e Autorização

- `JwtAuthGuard` é registrado como guard global via `APP_GUARD` no `AppModule` — todas as rotas são protegidas por padrão
- Rotas públicas (sem autenticação) usam `@Public()` de `src/common/decorators/public.decorator.ts`
- **NUNCA** usar `@UseGuards(JwtAuthGuard)` manualmente — o guard global já cobre
- Rotas de admin de grupo usam `@UseGuards(GroupRoleGuard)` + `@GroupRoles(GRUPO_ROLE.ADMIN)`
- Rotas restritas a membros do grupo usam `@UseGuards(GroupRoleGuard)` + `@GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)`
- Rotas de usuário próprio usam `@UseGuards(SelfOrAdminGuard)`
- Usar constantes de `src/common/constants/roles.constants.ts` para roles (`GRUPO_ROLE.ADMIN`, `PERFIL.SUPER_ADMIN`, etc.)

## Controllers

- Decorar com `@ApiTags`, `@ApiOperation`, `@ApiResponse` para Swagger
- Usar constantes do módulo para `@ApiTags` (ex: `@ApiTags(AUTH.TAG)`)
- Usuário autenticado via `@CurrentUser()` decorator

## Constantes

- Cada módulo tem um arquivo `{modulo}.constants.ts` com `TAG` (Swagger) e `MENSAGENS` (erros e respostas) como `as const`
- Usar constantes do módulo em vez de strings hardcoded em controllers, services e guards
- Roles globais em `src/common/constants/roles.constants.ts` (`PERFIL`, `GRUPO_ROLE`)
- Mensagens de validação de DTOs ficam inline (não extrair pra constantes)

## Services

- Injetar `PrismaService` via constructor (o `PrismaModule` é `@Global`)
- Não importar `PrismaService` diretamente nos modules — já está disponível globalmente
- Sempre validar existência do recurso antes de operar
- Usar `readonly` no PrismaService injetado

## Formatação

- Prettier: single quotes, trailing commas
- ESLint: `recommendedTypeChecked` do typescript-eslint
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-floating-promises`: warn

## Postman Collection

Sempre que um controller for criado ou alterado (novas rotas, método HTTP, path, body, guards), atualizar `postman_collection.json` na raiz do projeto.

- Manter estrutura Postman v2.1
- Endpoints públicos: `"auth": { "type": "noauth" }`
- Endpoints autenticados herdam Bearer token da collection
- Rotas de criação devem ter script de test salvando o ID na variável correspondente
- Login/refresh salvam `accessToken` e `refreshToken` automaticamente
- Agrupar por módulo usando folders com o nome do `@ApiTags`
- Body de exemplo deve refletir os campos do DTO
- Variáveis existentes: `baseUrl`, `accessToken`, `refreshToken`, `usuarioId`, `campeonatoId`, `temporadaId`, `grupoId`, `codigoConvite`, `membroId`

## README

Sempre que houver alteração em rotas, módulos, comandos de desenvolvimento ou regras de domínio, atualizar o `README.md` na raiz do projeto.

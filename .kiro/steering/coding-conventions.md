---
inclusion: always
---

# Convenções de Código

## Padrões de Erro

Preferir Domain Errors específicos (`src/common/errors/domain-errors/`) para erros de negócio nos services:

```typescript
// ✅ Preferido — domain error específico
throw new UsuarioNaoEncontradoError();
throw new EmailJaCadastradoError();
throw new GrupoNaoEncontradoError();

// ✅ Fallback — ErrorFactory para erros genéricos (guards, pipes, casos sem classe própria)
throw ErrorFactory.notFound('Recurso não encontrado');
throw ErrorFactory.forbidden('Sem permissão');
```

Domain Errors:
- Classe base abstrata: `DomainError` em `src/common/errors/domain-error.ts`
- Classes específicas por módulo em `src/common/errors/domain-errors/` (auth, usuarios, temporadas, grupos, grupo-usuario)
- Cada classe define `statusCode` e mensagem padrão via constantes do módulo
- `DomainExceptionFilter` captura `DomainError` e retorna no formato padrão
- Testes usam `expect(...).toThrow(NomeDaClasseDeErro)` em vez de verificar mensagem de texto

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
- Usar Presenters para transformar retornos: `return CampeonatoPresenter.toHttp(await this.service.criar(dto))`
- Presenters em `src/common/presenters/` com método estático `toHttp()` — seleção positiva (allowlist) de campos
- Para listas: `return items.map((i) => Presenter.toHttp(i))`
- Retornos de mensagem (`{ mensagem: '...' }`) não passam por Presenter

## Constantes

- Cada módulo tem um arquivo `{modulo}.constants.ts` com `TAG` (Swagger) e `MENSAGENS` (erros e respostas) como `as const`
- Usar constantes do módulo em vez de strings hardcoded em controllers, services e guards
- Roles globais em `src/common/constants/roles.constants.ts` (`PERFIL`, `GRUPO_ROLE`)
- Mensagens de validação de DTOs ficam inline (não extrair pra constantes)

## Services

- Services recebem repositórios via `@Inject(MODULO.REPOSITORY_TOKEN)` — **NUNCA** injetar `PrismaService` diretamente nos services
- Interfaces de repositório em `src/modules/{modulo}/repositories/{entidade}.repository.interface.ts`
- Implementações Prisma em `src/modules/{modulo}/repositories/prisma-{entidade}.repository.ts`
- Implementações InMemory em `src/modules/{modulo}/repositories/in-memory-{entidade}.repository.ts` (para testes)
- Token de injeção definido em `{modulo}.constants.ts` como `REPOSITORY_TOKEN`
- Sempre validar existência do recurso antes de operar (repository retorna `null`, service lança domain error)

## Formatação

- Prettier: single quotes, trailing commas
- ESLint: `recommendedTypeChecked` do typescript-eslint
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-floating-promises`: warn

## Testes

- Framework: Vitest 4 (nunca Jest)
- Instanciação direta com mocks (`vi.fn()`) ou InMemory repositories — **NUNCA** usar `TestingModule`
- Services testados com InMemory repositories: `new ServiceClass(inMemoryRepo)`
- Controllers testados com `new ControllerClass(mockService as any)`
- Guards testados com instanciação direta e mock de `ExecutionContext`
- Imports explícitos: `import { describe, it, expect, beforeEach, vi } from 'vitest'`
- Rodar testes: `docker exec bolao-backend-dev npx vitest run`

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

---
inclusion: always
---

# Convenções de Código

## Regras Críticas (NUNCA violar)

- **NUNCA duplicar funções com propósito similar** — se duas funções fazem mapeamento parecido (ex: `mapearStatus` e `mapearStatusApiFootball`), unificar em uma só ou deixar claro qual é a canônica
- **NUNCA colocar lógica de autorização no controller** — sempre via Guards (`SuperAdminGuard`, `GroupRoleGuard`, etc.)
- **NUNCA duplicar dados entre URL param e body do DTO** — se o dado vem do `@Param`, não incluir no DTO
- **NUNCA operar sobre dados dependentes sem validar estado** — ex: calcular placar agregado sem verificar se o jogo de ida está FINALIZADO
- **NUNCA permitir mudança de estado sem validar contexto** — ex: resetar fonteResultado sem verificar se externoId existe
- **SEMPRE adicionar `@@index` no Prisma para campos usados em queries de listagem** — FK não cria índice automático no PostgreSQL
- **SEMPRE criar testes junto com o código** — testes unitários de services e controllers NUNCA são opcionais, devem ser criados na mesma task que o código
- **SEMPRE revisar o fluxo completo após gerar código** — geração automática pode criar inconsistências entre componentes
- **SEMPRE tipar DTOs com union types em vez de `string` genérico** — ex: `tipo: 'PONTOS_CORRIDOS' | 'MATA_MATA'` em vez de `tipo: string` com `@IsIn`
- **SEMPRE validar variáveis de ambiente no startup** — usar `OnModuleInit` para validar e logar warning se env var obrigatória estiver ausente
- **SEMPRE extrair métodos quando complexidade cognitiva > 15** — quebrar em helpers privados com nomes descritivos
- **SEMPRE usar early returns em vez de ifs aninhados** — reduz complexidade cognitiva e melhora legibilidade
- **SEMPRE extrair lógica duplicada em helpers** — se o mesmo bloco aparece 2+ vezes, criar método privado (ex: `validarSemDesempate`, `determinarVencedorPorPlacar`, `buildUpdateFinalizado`)
- **NUNCA fazer queries em loop (N+1)** — buscar todos os dados necessários antes do loop com uma única query
- **NUNCA deixar código morto** — remover funções não chamadas por ninguém (YAGNI)
- **SEMPRE validar variáveis de ambiente no startup** — usar `OnModuleInit` para validar e logar warning se env var obrigatória estiver ausente
- **SEMPRE colocar guards genéricos em `src/modules/auth/`** — guards reutilizáveis (ex: `SuperAdminGuard`) não devem ficar dentro de módulos específicos
- **SEMPRE usar erro semântico correto** — se o jogo foi encontrado mas falta `externoId`, não lançar `JogoNaoEncontradoError`
- **NUNCA usar `any` em interfaces de repositório** — usar tipos do Prisma ou criar tipos próprios (dívida técnica atual, migrar gradualmente)

## Dívida Técnica

- Interfaces de repositório usam `Promise<any>` — migrar para tipos Prisma (`Prisma.Jogo`, `Prisma.Fase`, etc.)
- Presenters e services usam `any` nos parâmetros — tipar gradualmente

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

### Princípios SOLID

- **Single Responsibility:** Um service não deve acumular mais de uma responsabilidade de domínio. Se um service ultrapassa ~200 linhas ou mistura CRUD com lógica complexa de negócio (ex: finalização, importação, sincronização), dividir em services especializados (ex: `JogoService` + `FinalizacaoService` + `ImportacaoService`)
- **Open/Closed:** Preferir composição e Strategy pattern quando houver lógica condicional por tipo (ex: tipo de fase). Para 2-3 variantes, if/else é aceitável; acima disso, extrair estratégias
- **Liskov Substitution:** Implementações de repositório (Prisma e InMemory) devem ser intercambiáveis sem alterar comportamento. Mesma regra para domain errors que estendem `DomainError`
- **Interface Segregation:** Services externos (APIs de terceiros) devem ser acessados via interface, não classe concreta. Criar interface com os métodos necessários e injetar via token, igual aos repositories
- **Dependency Inversion:** Services dependem de abstrações (interfaces de repositório, interfaces de serviços externos), nunca de implementações concretas. Configuração de ambiente via `ConfigService` do NestJS, nunca `process.env` direto nos services

### Guards reutilizáveis

- Guards genéricos (ex: `SuperAdminGuard`) devem ficar em `src/common/guards/` ou `src/modules/auth/`, não dentro de módulos específicos
- Guards específicos de domínio (ex: `GroupRoleGuard`) ficam no módulo correspondente

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

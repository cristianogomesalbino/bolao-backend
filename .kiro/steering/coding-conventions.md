---
inclusion: always
---

# Convenções de Código

## Regras Críticas (NUNCA violar)

- **NUNCA duplicar funções com propósito similar** — se duas funções fazem mapeamento parecido (ex: `mapearStatus` e `mapearStatusExterno`), unificar em uma só ou deixar claro qual é a canônica
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
- **SEMPRE criar endpoints consolidados quando o frontend precisa de dados de múltiplas entidades** — ex: se a tela precisa de "próximo jogo + total adiados", criar 1 endpoint que retorna tudo em vez de forçar o frontend a fazer N requests por fase
- **NUNCA deixar código morto** — remover funções não chamadas por ninguém (YAGNI)
- **SEMPRE validar variáveis de ambiente no startup** — usar `OnModuleInit` para validar e logar warning se env var obrigatória estiver ausente
- **SEMPRE colocar guards genéricos em `src/modules/auth/`** — guards reutilizáveis (ex: `SuperAdminGuard`) não devem ficar dentro de módulos específicos
- **SEMPRE usar erro semântico correto** — se o jogo foi encontrado mas falta `externoId`, não lançar `JogoNaoEncontradoError`
- **NUNCA usar `any` em interfaces de repositório** — definir tipos próprios na interface (ex: `Temporada`, `TemporadaComCampeonato`, `CriarTemporadaData`). Repositories devem retornar `Promise<Tipo>`, nunca `Promise<any>`
- **SEMPRE tipar retornos de repository** — cada interface define seus tipos de entrada e saída como interfaces exportadas no mesmo arquivo
- **Padrão de tipagem de repository:**
  - Tipo base: `interface Entidade { id: string; ... }` (campos do model Prisma)
  - Tipo com relações: `interface EntidadeComRelacoes extends Entidade { relacao?: {...} }`
  - Tipo de criação: `interface CriarEntidadeData { ... }` (campos obrigatórios sem id/datas)
  - Retornos: `criar(): Promise<Entidade>`, `buscarPorId(): Promise<Entidade | null>`, `buscarTodos(): Promise<EntidadeComRelacoes[]>`
- **SEMPRE validar pertencimento entre entidades dependentes** — ex: verificar se a fase pertence à temporada do grupo antes de operar. Não confiar apenas na existência do recurso
- **SEMPRE usar métodos batch para operações em lote** — ex: `buscarPorIds`, `criarVarios`, `buscarPorUsuarioEJogos`. Nunca chamar métodos individuais dentro de loops
- **SEMPRE nomear Domain Errors pela ação exata** — não reutilizar um erro de outro contexto (ex: não usar `NaoPodeRemoverCriadorError` quando a ação é alterar role; criar `NaoPodeAlterarRoleCriadorError`)
- **SEMPRE usar constantes de roles em DTOs** — `@IsIn([GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER])` em vez de `@IsIn(['ADMIN', 'MEMBER'])`
- **NUNCA salvar datas de APIs externas sem conversão explícita de timezone** — APIs brasileiras retornam BRT sem offset; sempre adicionar `-03:00` antes de `new Date()`
- **NUNCA salvar datas inválidas (epoch/1970)** — validar que `getFullYear() >= 2020` antes de persistir; se inválida, salvar como `null` com status adequado
- **SEMPRE definir transições de status válidas** — usar mapa `TRANSICOES_VALIDAS` e validar antes de alterar status
- **SEMPRE incluir dados de relações necessários para o front** — ex: `include: { timeCasa: true, timeFora: true }` em queries de listagem de jogos
- **SEMPRE ter fallback de rodada atual** — endpoints de listagem sem `?rodada` devem retornar a menor rodada com jogos não finalizados

## Dívida Técnica

- AuthService usa PrismaService diretamente — migrar para Repository Pattern
- ACCESS_EXPIRATION e REFRESH_EXPIRATION ambos com '7d' — separar (access: 15m, refresh: 7d)

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
- Presenters podem ter variantes por nível de acesso: `toHttp` (admin/completo), `toHttpMembro` (membro sem dados sensíveis), `toHttpBasico` (público/não-membro)
- Campos internos/administrativos (`externoId`, `fonteResultado`, `criadoPor`) **NUNCA** devem ser expostos no presenter padrão
- Campos sensíveis como `codigoConvite` devem ser expostos apenas para admins do grupo

## Constantes

- Cada módulo tem um arquivo `{modulo}.constants.ts` com `TAG` (Swagger) e `MENSAGENS` (erros e respostas) como `as const`
- Usar constantes do módulo em vez de strings hardcoded em controllers, services e guards
- Roles globais em `src/common/constants/roles.constants.ts` (`PERFIL`, `GRUPO_ROLE`)
- Mensagens de validação de DTOs ficam inline (não extrair pra constantes)
- **NUNCA usar números mágicos** — extrair para constantes nomeadas no `{modulo}.constants.ts`:
  - Configurações de segurança: `AUTH.BCRYPT_ROUNDS`, `AUTH.TOKEN.ACCESS_EXPIRATION`, `AUTH.TOKEN.REFRESH_EXPIRATION`
  - Limites de negócio: `GRUPOS.MAX_PARTICIPANTES_DEFAULT`, `GRUPOS.CODIGO_CONVITE_LENGTH`
  - Pontuação: `RANKING.PONTOS.ACERTO_EM_CHEIO`, `RANKING.MULTIPLICADOR_DOBRO`
- DTOs de validação (`@Max`, `@Length`, `@Min`) devem referenciar constantes, não valores literais

## Services

- Services recebem repositórios via `@Inject(MODULO.REPOSITORY_TOKEN)` — **NUNCA** injetar `PrismaService` diretamente nos services
- Interfaces de repositório em `src/modules/{modulo}/repositories/{entidade}.repository.interface.ts`
- Implementações Prisma em `src/modules/{modulo}/repositories/prisma-{entidade}.repository.ts`
- Implementações InMemory em `src/modules/{modulo}/repositories/in-memory-{entidade}.repository.ts` (para testes)
- Token de injeção definido em `{modulo}.constants.ts` como `REPOSITORY_TOKEN`
- Sempre validar existência do recurso antes de operar (repository retorna `null`, service lança domain error)
- Ao adicionar novo método ao repositório, atualizar os 3 arquivos: interface + Prisma + InMemory
- Preferir métodos batch (`buscarPorIds`, `criarVarios`, `buscarPorUsuarioEJogos`) para operações em lote — evita N+1

## Formatação

- Prettier: single quotes, trailing commas
- ESLint: `recommendedTypeChecked` do typescript-eslint
- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-floating-promises`: warn
- `@typescript-eslint/no-unsafe-argument`: warn (dívida técnica aceita — não bloqueia)
- **SEMPRE usar optional chaining** — `!obj || !obj.prop` → `!obj?.prop`
- **SEMPRE quebrar tipos de retorno longos em múltiplas linhas** — se o tipo inline tem mais de 80 caracteres, quebrar com uma propriedade por linha
- **SEMPRE quebrar parâmetros de função em múltiplas linhas** — se a assinatura ultrapassa 100 caracteres
- **NUNCA deixar condições compostas longas em uma linha** — extrair em variáveis com nomes descritivos (ex: `const semData = !jogo.dataHora && !jogoApi?.dataHora`)

## Qualidade de Código (Lint/Sonar)

- **SEMPRE verificar diagnostics após criar/editar arquivo .ts** — usar getDiagnostics e corrigir TODOS os erros (não apenas warnings). Zero errors é obrigatório antes de considerar o código pronto
- **SEMPRE usar optional chaining** quando acessar propriedades de objetos possivelmente null/undefined
- **SEMPRE manter complexidade cognitiva ≤ 15** — se ultrapassar, extrair helpers privados. NÃO aceitar "vou resolver depois"
- **NUNCA usar `any` em código novo** — tipar tudo com interfaces próprias. Parâmetros de métodos, retornos, variáveis locais. Se recebe `any` de um repository, fazer cast com `as TipoEsperado` imediatamente
- **NUNCA commitar com erros de Prettier** — formatação deve estar correta antes de qualquer commit
- **NUNCA aninhar ifs** — máximo 1 nível dentro de um `if`. Se precisar de `if` dentro de `if`, extrair em método privado ou usar early return
- **SEMPRE executar `getDiagnostics` ANTES de declarar que o código está pronto** — é a etapa final obrigatória
- **Ao criar código novo, seguir estes padrões para evitar issues de Sonar:**
  - Usar `?.` em vez de `&& obj.prop` (S6582)
  - Marcar membros como `readonly` quando não são reatribuídos (S2933)
  - Remover imports não utilizados (S1128)
  - Não criar classes vazias (S2094)
  - Não duplicar imports do mesmo módulo (S3863)

## Protocolo de Validação (obrigatório em TODA entrega)

1. **getDiagnostics** em cada arquivo criado/editado — 0 errors obrigatório
2. **Rodar testes** (`npx vitest run`) — 0 falhas obrigatório
3. **Verificar container Docker** — `Nest application successfully started` sem erros
4. Se getDiagnostics retorna warnings de complexidade ou `any`:
   - Complexidade > 15: extrair helper ANTES de entregar
   - `any` em código novo: tipar ANTES de entregar
   - `any` em código legado tocado: aplicar regra dos 10%
5. **Nunca declarar "pronto" sem rodar os 4 passos acima**

## Redução Gradual de Dívida Técnica (Regra dos 10%)

- **Se um arquivo editado tem QUALQUER erro de `any` em código novo**, tipar o arquivo inteiro — não apenas o trecho novo. Corrigir interface + Prisma + InMemory do módulo correspondente.
- **Sempre que editar um arquivo .ts existente**, corrigir pelo menos **10% dos erros de lint pré-existentes** nesse arquivo (arredondando pra cima, mínimo 1)
- Prioridade de correção:
  1. Erros de Prettier (formatação)
  2. Optional chaining (`!obj || !obj.prop` → `!obj?.prop`)
  3. Complexidade cognitiva > 15 (extrair helpers)
  4. `Unsafe ... any value` — tipar parâmetros de métodos e retornos de repositórios com tipos próprios definidos na interface
- **Cálculo:** se o arquivo tem 290 erros de lint, corrigir pelo menos 29 ao editá-lo. Se tem 5, corrigir pelo menos 1.
- **Não quebrar funcionalidade** — ao tipar, garantir que os 3 arquivos (interface + Prisma + InMemory) estão alinhados
- **Documentar no commit** — mencionar "redução de dívida técnica" quando aplicável
- **Meta:** zero erros de lint em código novo. Código legado deve ser tipado ao ser editado.

## Segurança — Arquivos Sensíveis

- **NUNCA commitar arquivos com credentials/tokens/senhas** — connection strings, API keys, tokens de acesso
- **Arquivos que NUNCA devem ir pro git:**
  - `.kiro/settings/mcp.json` (contém connection strings de banco)
  - `.env` (já no gitignore, mas validar)
  - Qualquer arquivo com senhas, tokens ou chaves de API em texto puro
- **SEMPRE verificar `.gitignore` ANTES de criar arquivos com dados sensíveis** — se o path não está ignorado, adicionar ANTES de criar o arquivo
- **NUNCA colocar credentials em arquivos de configuração que são trackeados** — usar variáveis de ambiente ou referências a secrets
- **Se criar um arquivo MCP, Docker ou de configuração que requer credentials:**
  1. Verificar se o path está no `.gitignore`
  2. Se não está, adicionar ao `.gitignore` ANTES de criar
  3. Usar variáveis de ambiente (`${}`) ou referências a secrets em vez de valores literais
- **Se detectar que um arquivo sensível foi commitado:** alertar IMEDIATAMENTE o usuário para rotacionar as credenciais

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

## Code Review

Sempre que um code review for solicitado, seguir as instruções completas do arquivo `code-review-bolao.md` (steering manual).

- Arquivo de saída: `docs/outputs_ai/code-review-[FEATURE].md`
- Formato, ordem de execução e checklist estão definidos no steering `code-review-bolao.md`
- Incluir o steering via `#code-review-bolao.md` no chat antes de iniciar o review

## README

Sempre que houver alteração em rotas, módulos, comandos de desenvolvimento ou regras de domínio, atualizar o `README.md` na raiz do projeto.

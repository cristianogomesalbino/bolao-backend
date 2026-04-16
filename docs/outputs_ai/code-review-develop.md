# Code Review — Develop (Partidas + Palpites)

**Branch:** develop (88e0910..b0a4e2e)
**Features:** Módulo Jogos/Partidas + Módulo Palpites
**Arquivos alterados:** 121 (+9981 / -390 linhas)

---

## Passo 1 — Escopo

Features analisadas:
- `[partidas]` — Módulo Jogos (Fase, Jogo, ApiFootball, importação, sincronização, status híbrido)
- `[palpites]` — Módulo Palpites (Palpite, PalpiteDobrado, TokenDobro)
- Cross-cutting: guards movidos pra `common/`, decorators movidos, testes migrados pra `test/`

---

## Passo 2 — Compilação e Integridade

[CR-001] - `import type` ausente em services com `emitDecoratorMetadata`

Descrição:
Imports de interfaces de repositório em `jogo.service.ts` e `fase.service.ts` usam `import` regular em vez de `import type`. Com `isolatedModules` + `emitDecoratorMetadata` habilitados, isso gera erro de compilação.

Arquivo: `src/modules/jogos/jogo.service.ts` (linhas 3-4), `src/modules/jogos/fase.service.ts` (linhas 5-6)

Código atual:
```typescript
import { JogoRepository } from './repositories/jogo.repository.interface';
import { FaseRepository } from './repositories/fase.repository.interface';
```

Código sugerido:
```typescript
import type { JogoRepository } from './repositories/jogo.repository.interface';
import type { FaseRepository } from './repositories/fase.repository.interface';
```

Impacto: alto
Categoria: bug
Regra violada: compilação TypeScript com isolatedModules

---

## Passo 3 — Segurança

[CR-002] - `$queryRaw` no PrismaTokenDobroRepository

Descrição:
O método `calcularSaldo` usa `$queryRaw` com template literal. Embora template literals do Prisma sejam parametrizados automaticamente (safe), a convenção do projeto é evitar `$queryRaw`. Além disso, o cálculo pode ser feito com `groupBy` ou `count` do Prisma Client sem SQL raw.

Arquivo: `src/modules/palpites/repositories/prisma-token-dobro.repository.ts` (linha 18)

Código atual:
```typescript
const [result] = await this.prisma.$queryRaw<[{ saldo: bigint }]>`
  SELECT COALESCE(
    COUNT(*) FILTER (WHERE tipo = 'CONCESSAO') -
    COUNT(*) FILTER (WHERE tipo = 'UTILIZACAO'), 0
  ) AS saldo
  FROM "TokenDobro"
  WHERE "usuarioId" = ${usuarioId} AND "grupoId" = ${grupoId}
`;
```

Código sugerido:
```typescript
async calcularSaldo(usuarioId: string, grupoId: string): Promise<number> {
  const tokens = await this.prisma.tokenDobro.groupBy({
    by: ['tipo'],
    where: { usuarioId, grupoId },
    _count: true,
  });
  const concessoes = tokens.find((t) => t.tipo === 'CONCESSAO')?._count ?? 0;
  const utilizacoes = tokens.find((t) => t.tipo === 'UTILIZACAO')?._count ?? 0;
  return concessoes - utilizacoes;
}
```

Impacto: médio
Categoria: segurança
Regra violada: `$queryRaw` / `$executeRaw` (NUNCA usar)

---

[CR-003] - `process.env.RAPIDAPI_KEY` direto no ApiFootballService

Descrição:
Lê variável de ambiente diretamente sem `ConfigService`. Se a key não existir, manda header vazio sem aviso.

Arquivo: `src/modules/jogos/api-football.service.ts` (linha 12)

Impacto: médio
Categoria: segurança
Regra violada: Dependency Inversion — `ConfigService` em vez de `process.env`

---

## Passo 4 — Arquitetura

[CR-004] - `PalpiteController` injeta `GrupoUsuarioRepository` diretamente

Descrição:
O controller injeta um repositório (`GrupoUsuarioRepository`) e faz query de membros do grupo diretamente. Isso é lógica de negócio no controller — deveria estar no service.

Arquivo: `src/modules/palpites/palpite.controller.ts` (linhas 30-31, 103-106)

Código atual:
```typescript
constructor(
  private readonly palpiteService: PalpiteService,
  @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
  private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
) {}

// No método:
const membros = await this.grupoUsuarioRepo.listarPorGrupo(grupoId);
const membrosIds = membros.map((m) => m.usuarioId);
const palpites = await this.palpiteService.listarPorJogoNoGrupo(jogoId, grupoId, user.id, membrosIds);
```

Código sugerido:
```typescript
// Controller — thin
async listarPorJogoNoGrupo(...) {
  const palpites = await this.palpiteService.listarPorJogoNoGrupo(jogoId, grupoId, user.id);
  return palpites.map((p) => PalpitePresenter.toHttp(p));
}

// Service — busca membros internamente
async listarPorJogoNoGrupo(jogoId: string, grupoId: string, usuarioId: string) {
  const membros = await this.grupoUsuarioRepo.listarPorGrupo(grupoId);
  const membrosIds = membros.map((m) => m.usuarioId);
  // ...
}
```

Impacto: alto
Categoria: arquitetura
Regra violada: Controllers são thin — lógica de negócio NUNCA em controllers

---

[CR-005] - `JogoService` com 5 responsabilidades (~660 linhas)

Descrição:
Acumula CRUD, finalização, cálculo de vencedor, importação API-Football e sincronização de placares. Viola Single Responsibility.

Arquivo: `src/modules/jogos/jogo.service.ts`

Impacto: alto
Categoria: arquitetura
Regra violada: Single Responsibility — service > 200 linhas, dividir em especializados

---

[CR-006] - `ApiFootballService` sem interface — classe concreta injetada

Descrição:
Injetado diretamente como classe concreta no `JogoService`. Sem interface, sem token de injeção. Impossível trocar implementação sem alterar o service.

Arquivo: `src/modules/jogos/jogo.service.ts` (linha 40), `src/modules/jogos/jogos.module.ts`

Impacto: médio
Categoria: arquitetura
Regra violada: Interface Segregation + Dependency Inversion — services externos via interface + token

---

[CR-007] - `PalpiteDobradoService.ativarDobro` sem transação

Descrição:
`ativarDobro` faz `registrarUtilizacao` + `criar` em duas operações separadas. Se o `criar` falhar, o token já foi consumido. Deveria usar `$transaction`.

Arquivo: `src/modules/palpites/palpite-dobrado.service.ts` (linhas 35-36)

Código atual:
```typescript
await this.tokenDobroService.registrarUtilizacao(usuarioId, grupoId, jogoId);
return this.palpiteDobradoRepo.criar({ usuarioId, jogoId, grupoId });
```

Impacto: alto
Categoria: bug
Regra violada: Usar transação Prisma quando há múltiplas operações dependentes

---

## Passo 5 — Tipagem

[CR-008] - Repositories retornam `Promise<any>` em todas as interfaces

Descrição:
Todas as interfaces de repositório (Fase, Jogo, Palpite, PalpiteDobrado, TokenDobro) retornam `Promise<any>`. Gera ~180+ erros de lint por unsafe access nos services.

Arquivos: todos os `*.repository.interface.ts`

Impacto: médio
Categoria: tipagem

---

## Passo 6 — Consistência

[CR-009] - `CriarFaseDto.nome` sem `@IsNotEmpty`

Descrição:
O campo `nome` tem `@IsString` mas não `@IsNotEmpty`. Strings vazias passam pela validação.

Arquivo: `src/modules/jogos/dto/criar-fase.dto.ts` (linha 17)

Impacto: médio
Categoria: consistência
Regra violada: DTOs devem validar campos obrigatórios

---

[CR-010] - `ConfigurarDobroDto` — mensagem genérica no `@IsDefined`

Descrição:
Usa `'O campo é obrigatório'` sem nomear o campo.

Arquivo: `src/modules/palpites/dto/configurar-dobro.dto.ts` (linha 7)

Código sugerido:
```typescript
@IsDefined({ message: 'permitirPalpiteDobrado é obrigatório' })
```

Impacto: baixo
Categoria: consistência

---

[CR-011] - `PalpitePresenter` não inclui `atualizadoEm`

Descrição:
O model Palpite tem `atualizadoEm` mas o presenter não expõe. Pode ser útil pro frontend.

Arquivo: `src/common/presenters/palpite.presenter.ts`

Impacto: baixo
Categoria: consistência

---

## Passo 7 — Testes

[CR-012] - Sem testes para `SuperAdminGuard`

Descrição:
Guard criado em `src/common/guards/super-admin.guard.ts` sem spec correspondente.

Impacto: médio
Categoria: testes

---

## Passo 8 — Princípios SOLID

[CR-013] - `PalpiteDobradoService` injeta `TokenDobroService` como classe concreta

Descrição:
Segue o mesmo anti-pattern do `ApiFootballService` — service injetado como classe concreta em vez de interface + token.

Arquivo: `src/modules/palpites/palpite-dobrado.service.ts` (linha 16)

Impacto: baixo
Categoria: arquitetura
Regra violada: Dependency Inversion

---

## Passo 9 — Clean Code

[CR-014] - `mapearStatus` — código morto no JogoService

Descrição:
Método public que não é chamado por ninguém. `definirStatusFinal` já usa `mapearStatusApiFootball`.

Arquivo: `src/modules/jogos/jogo.service.ts` (linha ~680)

Impacto: baixo
Categoria: clean code

---

[CR-015] - `calcularVencedor` — método público não utilizado

Descrição:
Método public sem nenhuma chamada no codebase. Se é pra uso futuro (Ranking), marcar com TODO ou remover.

Arquivo: `src/modules/jogos/jogo.service.ts` (linha ~390)

Impacto: baixo
Categoria: clean code

---

[CR-016] - Complexidade cognitiva acima do limite

Descrição:
`sincronizarPlacares` (30, limite 15) e `calcularVencedor` (19, limite 15).

Arquivo: `src/modules/jogos/jogo.service.ts`

Impacto: médio
Categoria: clean code

---

[CR-017] - Duplicação: guard "sem prorrogação" em 2 métodos

Descrição:
8 linhas idênticas em `finalizarPontosCorridos` e `finalizarJogoIda`. Extrair pra `validarSemDesempate(dto)`.

Arquivo: `src/modules/jogos/jogo.service.ts` (linhas ~155 e ~185)

Impacto: baixo
Categoria: clean code

---

## Passo 10 — Debug e Logs

Nenhum `console.log` ou `debugger` encontrado. ✅

---

## Passo 11 — Performance

[CR-018] - N+1 queries na importação de jogos

Descrição:
`importarJogos` faz `buscarPorExternoId` pra cada fixture no loop. Com 380 jogos = 380 queries.

Arquivo: `src/modules/jogos/jogo.service.ts` (linha ~490)

Impacto: médio
Categoria: performance

---

## Passo 12 — Postman & Documentação

Postman e README foram atualizados. ✅

---

## 📌 Resumo da Feature

- Nível geral da qualidade: **médio**
- Risco de deploy: **médio**
- Principais problemas:
  1. `ativarDobro` sem transação — pode consumir token sem criar o dobro
  2. Controller com lógica de negócio (query de membros)
  3. `JogoService` God Class com 660 linhas

## 📉 Dívida Técnica Estimada

- **moderada** — tipagem `any` generalizada, `JogoService` precisa de split, `ApiFootballService` sem interface

## 📊 Tabela SonarQube Simulada

| Categoria | Encontrados | Críticos | Bloqueiam Merge |
|-----------|------------|----------|-----------------|
| 🐛 Bugs | 3 | 2 (CR-001, CR-007) | ✅ |
| 🔓 Vulnerabilities | 2 | 0 | ❌ |
| 🧹 Code Smells | 8 | 2 (complexidade) | ❌ |
| 📊 Duplicação | 4 blocos | 0 | ❌ |

## 📋 Prioridades

| # | ID | Descrição | Impacto | Bloqueia Merge |
|---|---|---|---|---|
| 1 | CR-007 | `ativarDobro` sem transação — token consumido sem criar dobro | crítico | ✅ |
| 2 | CR-001 | `import type` ausente — erro de compilação | alto | ✅ |
| 3 | CR-004 | Repository injetado no controller — lógica no lugar errado | alto | ⚠️ |
| 4 | CR-005 | JogoService God Class 660 linhas | alto | ❌ |
| 5 | CR-002 | `$queryRaw` no TokenDobro | médio | ❌ |
| 6 | CR-003 | `process.env` direto | médio | ❌ |
| 7 | CR-006 | ApiFootballService sem interface | médio | ❌ |
| 8 | CR-008 | Tipagem `any` nos repositories | médio | ❌ |
| 9 | CR-009 | `CriarFaseDto.nome` sem `@IsNotEmpty` | médio | ❌ |
| 10 | CR-018 | N+1 na importação | médio | ❌ |

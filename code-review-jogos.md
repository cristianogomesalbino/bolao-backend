# Code Review — Módulo de Jogos (Revalidação)

## Itens Corrigidos ✅

1. ✅ Sincronização quebrada — `definirStatusFinal` agora chama `mapearStatusApiFootball` em vez de `mapearStatus`
2. ✅ Autorização via Guard — criado `SuperAdminGuard`, removida lógica inline do controller. `ApiFootballService` removido do construtor do controller
3. ✅ Modo híbrido — agora flipa `fonteResultado` para `MANUAL` em qualquer edição de jogo `API_FOOTBALL`, não só em troca de times
4. ✅ `temporadaId` removido do body do `CriarFaseDto` — vem apenas do `@Param`
5. ✅ `faseId` removido do body do `CriarJogoDto` — vem apenas do `@Param`
6. ✅ `resetarFonte` agora valida existência de `externoId` antes de resetar
7. ✅ `finalizarJogoVolta` agora valida que jogo de ida está `FINALIZADO`
8. ✅ `JogoPresenter` agora inclui `atualizadoEm`
9. ✅ Índices `@@index` adicionados em `Fase.temporadaId` e `Jogo.faseId` no schema Prisma

## Itens Pendentes

### 🟡 `mapearStatus` ficou órfão

A função `mapearStatus` (que mapeia `SCHEDULED`, `LIVE`, etc.) ainda existe no `JogoService` mas não é mais chamada por ninguém. Código morto — pode ser removida.

### 🟡 `SuperAdminGuard` no lugar errado

O guard foi criado em `src/modules/jogos/super-admin.guard.ts`. Como é um guard genérico (não específico de jogos), deveria ficar em `src/common/guards/` ou `src/modules/auth/` para ser reutilizável por outros módulos futuros (ex: Palpites, Ranking).

### 🟡 `CriarFaseDto.nome` perdeu `@IsNotEmpty`

Na correção do DTO, o campo `nome` ficou sem `@IsNotEmpty({ message: 'nome é obrigatório' })`. Strings vazias vão passar pela validação.

### 🟡 `CriarFaseDto.tipo` continua como `string`

Poderia ser tipado como `'PONTOS_CORRIDOS' | 'MATA_MATA'` para type safety. Menor prioridade.

### 🟡 `AtualizarJogoDto.status` continua como `string`

Mesmo caso — poderia usar union type ou enum do Prisma.

### 🟡 Tipagem `any` nos repositories e services

As interfaces de repositório continuam retornando `Promise<any>` em tudo, gerando ~180 erros de lint no `JogoService`. Os imports de `JogoRepository` e `FaseRepository` no service continuam sem `import type`, causando erros com `isolatedModules` + `emitDecoratorMetadata`.

### 🟡 Complexidade cognitiva

`calcularVencedor` (19) e `sincronizarPlacares` (30) continuam acima do limite de 15.

### 🟡 `ApiFootballService` continua lendo `process.env` direto

Sem `ConfigService`, sem validação de presença da key no startup.

### 🟡 `resetarFonte` — erro semântico no domain error

Quando `externoId` é null, lança `JogoNaoEncontradoError`. Mas o jogo foi encontrado — o problema é que ele não tem `externoId`. Seria mais preciso ter um erro específico ou reusar uma mensagem mais adequada (ex: "Jogo não possui externoId para resetar fonte").

### 🟡 Migração Prisma pendente para os novos `@@index`

Os `@@index([temporadaId])` e `@@index([faseId])` foram adicionados ao schema, mas não vi uma nova migração gerada. Precisa rodar `sh dev npx prisma migrate dev --name add_indexes_fase_jogo` para aplicar.

---

## Análise SOLID

### S — Single Responsibility ❌

O `JogoService` acumula pelo menos 5 responsabilidades distintas (~660 linhas, 25+ métodos):

1. CRUD de jogos (criar, atualizar, buscar)
2. Lógica de finalização (pontos corridos, mata-mata simples, ida/volta)
3. Cálculo de vencedor (tempo normal, prorrogação, pênaltis, agregado)
4. Importação via API-Football (mapear fixtures → jogos)
5. Sincronização de placares + status híbrido (fallback por tempo)

Cada responsabilidade muda por motivos diferentes — regra de finalização muda independente da integração com API-Football.

Sugestão de split:
- `JogoService` — CRUD + validações básicas
- `FinalizacaoService` — toda lógica de finalizar (pontos corridos, mata-mata, ida/volta, cálculo de vencedor)
- `ImportacaoService` — importar, sincronizar, mapear status, modo híbrido

O `FaseService` e os controllers estão ok nesse princípio.

### O — Open/Closed ⚠️

A lógica de finalização usa `if/else` encadeado pra decidir o tipo (pontos corridos vs mata-mata vs ida vs volta). Se surgir um novo tipo de fase (ex: `GRUPOS`), precisa abrir o `JogoService` e adicionar mais branches.

Alternativa: Strategy pattern — cada tipo de fase com sua própria estratégia de finalização. Pra 2 tipos de fase, o custo de abstração pode não compensar ainda. Ponto de atenção pro futuro.

O `mapearStatusApiFootball` com switch/case tem o mesmo padrão — novo status da API = abrir o método. Aceitável pra um mapeamento simples.

### L — Liskov Substitution ✅

Os repositories seguem bem. `InMemoryFaseRepository` e `PrismaFaseRepository` implementam `FaseRepository` e são intercambiáveis sem quebrar comportamento. Mesma coisa pro `JogoRepository`. Testes usam InMemory, produção usa Prisma.

Os domain errors estendem `DomainError` corretamente, cada um com seu `statusCode`.

### I — Interface Segregation ⚠️

`JogoRepository` tem 6 métodos, e nem todo consumidor precisa de todos. Pra 6 métodos não é grave, mas vale monitorar conforme cresce.

O ponto mais relevante: `ApiFootballService` é injetado como classe concreta no `JogoService`, não via interface. Se amanhã quiser trocar por outra API de futebol (ou um mock em testes), precisa alterar o service. Deveria ter uma interface `FootballApiProvider` com `buscarFixtures` e `buscarFixturesPorIds`, injetada via token.

### D — Dependency Inversion ⚠️

Repositories: seguem o padrão corretamente. Services dependem de interfaces (`FaseRepository`, `JogoRepository`), injetadas via token. A implementação concreta é definida no module.

O problema é o `ApiFootballService`:
- Injetado diretamente como classe concreta, sem interface
- Lê `process.env.RAPIDAPI_KEY` direto em vez de receber via `ConfigService` ou injeção
- O `JogoService` depende diretamente da implementação, não de uma abstração

Pra testar `JogoService` com InMemory repos, ainda precisa lidar com `ApiFootballService` concreto (ou mockar a classe inteira).

### Resumo SOLID

| Princípio | Status | Problema principal |
|-----------|--------|--------------------|
| S — Single Responsibility | ❌ | `JogoService` com 5 responsabilidades, ~660 linhas |
| O — Open/Closed | ⚠️ | Finalização via if/else, sem extensibilidade |
| L — Liskov Substitution | ✅ | Repositories e errors bem implementados |
| I — Interface Segregation | ⚠️ | `ApiFootballService` sem interface |
| D — Dependency Inversion | ⚠️ | `ApiFootballService` concreto + `process.env` direto |

---

## Análise SonarQube — Duplicação e Reaproveitamento

### Duplicação 1: Guard "sem prorrogação/pênaltis" (copy-paste)

8 linhas idênticas em `finalizarPontosCorridos` e `finalizarJogoIda`:

```typescript
// Aparece em AMBOS os métodos — linhas ~155 e ~185
if (
  dto.temProrrogacao ||
  dto.temPenaltis ||
  dto.golsProrrogacaoCasa != null ||
  dto.golsProrrogacaoFora != null ||
  dto.penaltisCasa != null ||
  dto.penaltisFora != null
) {
  throw new ProrrogacaoNaoPermitidaError();
}
```

Correção: extrair pra `validarSemDesempate(dto: FinalizarJogoDto)`.

### Duplicação 2: Objeto de update "finalizado sem extras" (3 ocorrências)

~10 linhas repetidas em `finalizarPontosCorridos`, `finalizarJogoIda` e `finalizarMataMataComVencedorTN`:

```typescript
return this.jogoRepo.atualizar(jogo.id, {
  status: 'FINALIZADO',
  golsCasa: dto.golsCasa,
  golsFora: dto.golsFora,
  temProrrogacao: false,
  golsProrrogacaoCasa: null,
  golsProrrogacaoFora: null,
  temPenaltis: false,
  penaltisCasa: null,
  penaltisFora: null,
  vencedorId,
});
```

Correção: extrair pra `buildUpdateFinalizado(dto, vencedorId, extras?)` que retorna o objeto de update.

### Duplicação 3: Cálculo de vencedor por placar simples (5 ocorrências)

O padrão `golsCasa > golsFora ? timeCasaId : timeForaId` aparece em:
- `finalizarPontosCorridos`
- `finalizarMataMataComVencedorTN`
- `finalizarMataMataComEmpate` (2x — prorrogação e pênaltis)
- `sincronizarPlacares`

Correção: extrair pra `determinarVencedorPorPlacar(casa: number, fora: number, timeCasaId: string, timeForaId: string): string | null`.

### Duplicação 4: `validarPlacarProrrogacao` e `validarPlacarPenaltis`

Estrutura quase idêntica (null check + negativo check). A diferença é só o campo acessado e o check de empate nos pênaltis.

```typescript
// Padrão repetido em ambos:
if (campo == null) throw new PlacarInvalidoError();
if (campo < 0) throw new PlacarInvalidoError();
```

Correção: extrair base `validarPlacarPar(casa: number | null | undefined, fora: number | null | undefined)` e chamar nos dois.

### Código morto

- `mapearStatus()` — public, não chamado por ninguém. Remover.
- `calcularVencedor()` — public, não chamado em nenhum lugar do codebase. Se é pra uso futuro, remover até ser necessário (YAGNI) ou marcar com `// TODO: usado pelo módulo de Palpites`.

### Performance: N+1 na importação

`importarJogos` faz `buscarPorExternoId` pra cada fixture no loop. Com 380 jogos do Brasileirão = 380 queries sequenciais.

Correção: buscar todos os `externoId` existentes da fase de uma vez antes do loop:

```typescript
const jogosExistentes = await this.jogoRepo.buscarPorFase(faseId);
const externosExistentes = new Set(
  jogosExistentes.filter((j) => j.externoId).map((j) => j.externoId),
);

for (const fixture of fixtures) {
  const externoId = String(fixture.fixture.id);
  if (externosExistentes.has(externoId)) continue;
  // ...
}
```

### Resumo Sonar simulado

| Categoria | Encontrados | Críticos | Bloqueia merge |
|-----------|------------|----------|----------------|
| 📊 Duplicação | 4 blocos (~80 linhas) | 0 | ❌ |
| 🧹 Code Smells | 6 | 2 (complexidade cognitiva) | ⚠️ |
| 💀 Código morto | 2 métodos | 0 | ❌ |
| ⚡ Performance | 1 (N+1 importação) | 0 | ❌ |

---

## Ifs Aninhados

### 1. `calcularVencedor` — 3 níveis de nesting

```typescript
if (jogo.temProrrogacao && ...) {
  if (jogo.golsProrrogacaoCasa > jogo.golsProrrogacaoFora) {
    return jogo.timeCasaId;
  }
  // ...
  if (jogo.temPenaltis && ...) {        // ← nível 3
    if (jogo.penaltisCasa > ...) {       // ← nível 4
      return jogo.timeCasaId;
    }
  }
}
```

Correção com early returns:

```typescript
calcularVencedor(jogo: any): string | null {
  if (jogo.status !== 'FINALIZADO') return null;
  if (jogo.golsCasa == null || jogo.golsFora == null) return null;

  if (jogo.golsCasa > jogo.golsFora) return jogo.timeCasaId;
  if (jogo.golsFora > jogo.golsCasa) return jogo.timeForaId;

  // Empate no tempo normal — checar prorrogação
  if (!jogo.temProrrogacao || jogo.golsProrrogacaoCasa == null || jogo.golsProrrogacaoFora == null) {
    return null;
  }

  if (jogo.golsProrrogacaoCasa > jogo.golsProrrogacaoFora) return jogo.timeCasaId;
  if (jogo.golsProrrogacaoFora > jogo.golsProrrogacaoCasa) return jogo.timeForaId;

  // Empate na prorrogação — checar pênaltis
  if (!jogo.temPenaltis || jogo.penaltisCasa == null || jogo.penaltisFora == null) {
    return null;
  }

  if (jogo.penaltisCasa > jogo.penaltisFora) return jogo.timeCasaId;
  if (jogo.penaltisFora > jogo.penaltisCasa) return jogo.timeForaId;

  return null;
}
```

Elimina todo o nesting e reduz a complexidade cognitiva de 19 pra ~6.

### 2. `sincronizarPlacares` — if dentro de for dentro de try

```typescript
for (const jogo of jogosComExterno) {
  // ...
  if (fixture && novoStatus === 'FINALIZADO') {    // ← nível 2
    // ...
    if (updateData.golsCasa != null && ...) {       // ← nível 3
      if (updateData.golsCasa > updateData.golsFora) {  // ← nível 4
        vencedorId = jogo.timeCasaId;
      } else if (...) {
        vencedorId = jogo.timeForaId;
      }
    }
  }
}
```

Correção: extrair o corpo do loop pra um método `processarSincronizacaoJogo(jogo, fixtureMap, apiDisponivel)` e usar early returns dentro dele. Isso também resolve a complexidade cognitiva de 30.

### 3. `finalizarMataMataComEmpate` — if com return longo dentro de outro if

```typescript
if (!empateProrrogacao) {
  if (dto.temPenaltis) {          // ← nível 2 desnecessário
    throw new PenaltisNaoPermitidoError();
  }
  // ... 15 linhas de return
}
```

Correção com early return invertido:

```typescript
if (empateProrrogacao) {
  // fluxo de pênaltis...
  return ...;
}

// Não empatou na prorrogação
if (dto.temPenaltis) {
  throw new PenaltisNaoPermitidoError();
}
// ... return sem nesting
```

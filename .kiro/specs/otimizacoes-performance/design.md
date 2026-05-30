# Documento de Design

## Visão Geral da Arquitetura

Este documento descreve a arquitetura das otimizações de performance, banco de dados, segurança e refatorações arquiteturais do Bolão Backend. As mudanças são organizadas em camadas independentes que podem ser implementadas incrementalmente sem quebrar funcionalidades existentes.

A estratégia geral é:
1. **Eliminar gargalos críticos** (O(38) HTTP, N+1 queries, processamento sequencial)
2. **Adicionar camada de cache** para cálculos pesados (ranking)
3. **Garantir integridade** com transações e índices
4. **Proteger a API** com rate limiting e CORS correto
5. **Melhorar manutenibilidade** com refatorações arquiteturais

## Componentes

### Componente 1: FutebolApiService Otimizado

**Responsabilidade:** Buscar dados de jogos da API externa de forma eficiente, usando metadados de rodada para evitar iteração completa das 38 rodadas.

**Estratégia:** Em vez de iterar rodadas 1-38 sequencialmente no `buscarJogosPorIds`, agrupar os IDs por rodada usando o campo `rodada` já armazenado na entidade Jogo, e buscar apenas as rodadas necessárias em paralelo.

```typescript
// Antes: O(38) chamadas HTTP sequenciais
async buscarJogosPorIds(ids: number[]): Promise<any[]> {
  for (let rodada = 1; rodada <= 38; rodada++) {
    // busca TODAS as rodadas mesmo que os IDs estejam em apenas 2-3
  }
}

// Depois: O(R) chamadas HTTP paralelas, onde R = rodadas distintas dos jogos
async buscarJogosPorIds(ids: number[], rodadasPorId: Map<number, number>): Promise<any[]> {
  const rodadasNecessarias = new Set([...rodadasPorId.values()]);
  const resultados = await Promise.allSettled(
    [...rodadasNecessarias].map(rodada => this.buscarJogosPorRodada(season, rodada))
  );
  // Filtra apenas os IDs solicitados dos resultados bem-sucedidos
}
```

**Interações:**
- `JogoService.sincronizarPlacares` → passa mapa de rodadas extraído dos jogos do banco
- `PrismaJogoRepository` → fornece rodadas dos jogos via campo existente

---

### Componente 2: RankingService com Queries Batch

**Responsabilidade:** Calcular rankings e conceder tokens usando queries batch em vez de N+1.

**Mudanças principais:**

1. **`buscarJogosFinalizadosDeFases`** — substituir loop com query individual por fase por uma única query `WHERE faseId IN (...)`.

2. **`concederTokensPorAcertoEmCheio`** — buscar todos os tokens existentes em batch antes do loop de membros.

3. **`concederTokensPorPosicaoRanking`** — buscar tokens existentes para todos os membros de primeiro/último lugar em uma query, criar tokens faltantes em batch.

4. **`verificarPalpitesCompletos`** — buscar todos os tokens PALPITES_COMPLETOS do grupo/fase em uma query antes de iterar membros.

```typescript
// Novo método no TokenDobroRepository
interface TokenDobroRepository {
  // ... métodos existentes
  buscarPorChaves(keys: { usuarioId: string; grupoId: string; motivo: string; referenciaId: string }[]): Promise<any[]>;
  criarVarios(data: Array<{ usuarioId: string; grupoId: string; tipo: string; motivo: string; referenciaId: string }>): Promise<void>;
}

// Novo método no JogoRepository
interface JogoRepository {
  // ... métodos existentes
  buscarFinalizadosPorFases(faseIds: string[]): Promise<any[]>;
}
```

---

### Componente 3: Processamento Concorrente de Grupos

**Responsabilidade:** Processar pontuação de múltiplos grupos em paralelo com isolamento de erros.

```typescript
async processarPontuacaoJogo(jogoId: string): Promise<void> {
  // ... validações existentes

  const resultados = await Promise.allSettled(
    grupos.map(grupo => this.processarPontuacaoJogoParaGrupo(jogo, fase, grupo))
  );

  for (const resultado of resultados) {
    if (resultado.status === 'rejected') {
      this.logger.error(`Erro ao processar grupo: ${resultado.reason.message}`);
    }
  }
}
```

---

### Componente 4: Batch Insert de Palpites

**Responsabilidade:** Inserir múltiplos palpites válidos em uma única operação de banco.

```typescript
// Novo método no PalpiteRepository
interface PalpiteRepository {
  // ... métodos existentes
  criarVarios(data: Array<{ usuarioId: string; jogoId: string; golsCasa: number; golsFora: number }>): Promise<any[]>;
}

// Implementação Prisma
async criarVarios(data: Array<{ usuarioId: string; jogoId: string; golsCasa: number; golsFora: number }>) {
  return this.prisma.palpite.createMany({ data, skipDuplicates: true });
}
```

**Mudança no PalpiteService.criarLote:**
- Separar palpites válidos dos inválidos na fase de validação
- Inserir todos os válidos em uma única chamada `criarVarios`
- Retornar resultados combinados (sucessos + erros de validação)

---

### Componente 5: Cache de Ranking

**Responsabilidade:** Cachear resultados de cálculo de ranking com invalidação baseada em eventos.

**Estratégia:** Usar `Map` em memória com TTL (adequado para deploy single-instance no Supabase). Chave: `ranking:{grupoId}:{faseId}:{rodada?}:{ateRodada?}`.

```typescript
interface CacheEntry<T> {
  data: T;
  expiraEm: number;
}

@Injectable()
export class RankingCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutos

  get<T>(chave: string): T | null {
    const entry = this.cache.get(chave);
    if (!entry || Date.now() > entry.expiraEm) {
      this.cache.delete(chave);
      return null;
    }
    return entry.data as T;
  }

  set<T>(chave: string, data: T): void {
    this.cache.set(chave, { data, expiraEm: Date.now() + this.TTL_MS });
  }

  invalidarPorGrupo(grupoId: string): void {
    for (const chave of this.cache.keys()) {
      if (chave.includes(grupoId)) {
        this.cache.delete(chave);
      }
    }
  }

  invalidarPorTemporada(temporadaId: string, grupoIds: string[]): void {
    for (const grupoId of grupoIds) {
      this.invalidarPorGrupo(grupoId);
    }
  }
}
```

**Invalidação:** Quando `processarPontuacaoJogo` é chamado (jogo finalizado), invalidar cache de todos os grupos da temporada.

---

### Componente 6: Índices de Banco de Dados

**Responsabilidade:** Adicionar índices ausentes para otimizar queries de listagem.

```prisma
model Temporada {
  // ... campos existentes
  @@index([campeonatoId])
}

model Grupo {
  // ... campos existentes
  @@index([temporadaId])
  @@index([criadoPor])
}

model GrupoUsuario {
  // ... campos existentes
  @@index([grupoId])
}

model RefreshToken {
  // ... campos existentes
  @@index([usuarioId])
}

model TokenDobro {
  // ... campos existentes
  @@index([referenciaId])
}
```

---

### Componente 7: Transações Atômicas

**Responsabilidade:** Garantir atomicidade em operações compostas.

**GruposService.criar:**
```typescript
async criar(dto: CriarGrupoDto, userId: string) {
  // ... validações

  return this.prisma.$transaction(async (tx) => {
    const grupo = await tx.grupo.create({ data: { ... } });
    await tx.grupoUsuario.create({ data: { usuarioId: userId, grupoId: grupo.id, role: 'ADMIN' } });
    return grupo;
  });
}
```

**PalpiteDobradoService.ativarDobro:**
```typescript
async ativarDobro(grupoId: string, jogoId: string, usuarioId: string) {
  // ... validações

  return this.prisma.$transaction(async (tx) => {
    const palpiteDobrado = await tx.palpiteDobrado.create({ data: { usuarioId, jogoId, grupoId } });
    await tx.tokenDobro.create({ data: { usuarioId, grupoId, tipo: 'UTILIZACAO', motivo: 'ATIVACAO_DOBRO', referenciaId: jogoId } });
    return palpiteDobrado;
  });
}
```

**Nota:** Para manter o Repository Pattern, adicionar um método `executarEmTransacao(callback)` na interface do repositório ou expor o `PrismaService` via um `TransactionService` dedicado.

---

### Componente 8: Rate Limiting

**Responsabilidade:** Proteger a API contra abuso com limites por IP e por usuário.

**Implementação:** Usar `@nestjs/throttler` (pacote oficial do NestJS).

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'geral', ttl: 60000, limit: 100 },
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

// auth.controller.ts — overrides específicos
@Throttle({ default: { ttl: 60000, limit: 5 } })
@Post('login')
async login() { ... }

@Throttle({ default: { ttl: 60000, limit: 3 } })
@Post('recuperar-senha')
async recuperarSenha() { ... }
```

**Resposta 429:**
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "retryAfter": 45
}
```

---

### Componente 9: CORS Condicional

**Responsabilidade:** Configurar origens CORS baseado no ambiente.

```typescript
// main.ts
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = isProduction
  ? ['https://bolao-frontend-beige.vercel.app']
  : ['http://localhost:3003', 'https://bolao-frontend-beige.vercel.app'];

app.enableCors({ origin: allowedOrigins, credentials: true });
```

---

### Componente 10: JWT via ConfigService

**Responsabilidade:** Centralizar acesso a variáveis de ambiente JWT usando ConfigService do NestJS.

```typescript
// auth.module.ts
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET não está definida nas variáveis de ambiente');
        }
        return {
          secret,
          signOptions: { expiresIn: AUTH.TOKEN.ACCESS_EXPIRATION },
        };
      },
    }),
  ],
})
export class AuthModule {}
```

---

### Componente 11: GroupRoleGuard com Repository Pattern

**Responsabilidade:** Refatorar o guard para depender da interface `GrupoUsuarioRepository` em vez de `PrismaService`.

```typescript
@Injectable()
export class GroupRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ... mesma lógica, usando grupoUsuarioRepo.buscarPorChave(usuarioId, grupoId)
  }
}
```

---

### Componente 12: Remoção do DomainExceptionFilter Duplicado

**Responsabilidade:** Registrar o filter em um único local.

**Decisão:** Manter o registro via `APP_FILTER` no `AppModule` (padrão NestJS para DI) e remover do `main.ts` via `useGlobalFilters`.

```typescript
// main.ts — REMOVER DomainExceptionFilter daqui
app.useGlobalFilters(
  new HttpExceptionFilter(),
  new PrismaExceptionFilter(),
  // DomainExceptionFilter REMOVIDO — já registrado via APP_FILTER no AppModule
);
```

---

### Componente 13: Divisão do JogoService

**Responsabilidade:** Separar o JogoService (350+ linhas) em services especializados.

**Estrutura final:**
```
src/modules/jogos/services/
├── jogo.service.ts           # CRUD + validação de transição de status (~100 linhas)
├── finalizacao.service.ts    # finalizar, finalizarPontosCorridos, finalizarMataMata (~150 linhas)
├── importacao.service.ts     # importarJogos, resolverOuCriarTime (~80 linhas)
├── sincronizacao.service.ts  # sincronizarPlacares, processarJogoSync (~100 linhas)
└── futebol-api.service.ts    # integração com API externa (sem mudança)
```

**Dependências:**
- `FinalizacaoService` → `JogoRepository`, `FaseRepository`, `RankingService`
- `ImportacaoService` → `JogoRepository`, `FaseRepository`, `TimeRepository`, `FutebolApiService`
- `SincronizacaoService` → `JogoRepository`, `FaseRepository`, `FutebolApiService`
- `JogoService` → `JogoRepository`, `FaseRepository` (apenas CRUD)

---

### Componente 14: Paginação

**Responsabilidade:** Adicionar suporte a paginação nos endpoints de listagem.

```typescript
// DTO genérico de paginação
export class PaginacaoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

// Interface de resposta paginada
interface RespostaPaginada<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Helper de paginação para repositórios Prisma
function calcularPaginacao(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
```

**Endpoints afetados:**
- `GET /campeonatos` → `CampeonatosController`
- `GET /temporadas` → `TemporadasController`
- `GET /grupos` → `GruposController`
- `GET /grupos/:grupoId/membros` → `GrupoUsuarioController`
- `GET /fases/:faseId/jogos` → `JogosController`
- `GET /palpites/meus` → `PalpitesController`

---

### Componente 15: Remoção de Código Morto

**Responsabilidade:** Remover código não utilizado.

- **`JogoService.calcularVencedor`** — método público nunca chamado externamente. A lógica de determinação de vencedor é feita inline nos métodos de finalização.
- **`fast-check` no package.json** — dependência de devDependencies não utilizada por nenhum teste.

## Interfaces

### Interface: JogoRepository (extensão)

```typescript
export interface JogoRepository {
  // ... métodos existentes mantidos

  /** Busca todos os jogos finalizados de múltiplas fases em uma query */
  buscarFinalizadosPorFases(faseIds: string[]): Promise<any[]>;
}
```

### Interface: TokenDobroRepository (extensão)

```typescript
export interface TokenDobroRepository {
  // ... métodos existentes mantidos

  /** Busca tokens por múltiplas chaves compostas em uma query */
  buscarPorChaves(keys: Array<{
    usuarioId: string;
    grupoId: string;
    motivo: string;
    referenciaId: string;
  }>): Promise<any[]>;

  /** Cria múltiplos tokens em uma operação batch */
  criarVarios(data: Array<{
    usuarioId: string;
    grupoId: string;
    tipo: 'CONCESSAO' | 'UTILIZACAO';
    motivo: string;
    referenciaId: string;
  }>): Promise<void>;
}
```

### Interface: PalpiteRepository (extensão)

```typescript
export interface PalpiteRepository {
  // ... métodos existentes mantidos

  /** Cria múltiplos palpites em uma operação batch */
  criarVarios(data: Array<{
    usuarioId: string;
    jogoId: string;
    golsCasa: number;
    golsFora: number;
  }>): Promise<any[]>;
}
```

### Interface: RankingCacheService

```typescript
export interface RankingCacheService {
  get<T>(chave: string): T | null;
  set<T>(chave: string, data: T): void;
  invalidarPorGrupo(grupoId: string): void;
  invalidarPorTemporada(temporadaId: string, grupoIds: string[]): void;
}
```

### Interface: TransactionService

```typescript
export interface TransactionService {
  executar<T>(callback: (tx: any) => Promise<T>): Promise<T>;
}
```

## Modelo de Dados

### Mudanças no Schema Prisma

Nenhum novo model é criado. As mudanças são exclusivamente adição de índices:

```prisma
model Temporada {
  // ... campos existentes
  @@index([campeonatoId])
}

model Grupo {
  // ... campos existentes
  @@index([temporadaId])
  @@index([criadoPor])
}

model GrupoUsuario {
  // ... campos existentes
  @@index([grupoId])
}

model RefreshToken {
  // ... campos existentes
  @@index([usuarioId])
}

model TokenDobro {
  // ... campos existentes
  @@index([referenciaId])
}
```

### Estrutura do Cache (em memória)

```
Chave: "ranking:{grupoId}:{faseId}:{rodada}:{ateRodada}"
Valor: { data: RankingEntry[], expiraEm: timestamp }
TTL: 5 minutos
Invalidação: por grupoId quando jogo é finalizado
```

## Tratamento de Erros

### Rate Limiting

| Cenário | Código HTTP | Resposta |
|---------|-------------|----------|
| Limite de login excedido | 429 | `{ statusCode: 429, message: "Too Many Requests" }` + header `Retry-After` |
| Limite de recuperação excedido | 429 | Idem |
| Limite geral excedido | 429 | Idem |

### Transações

| Cenário | Comportamento |
|---------|---------------|
| Falha ao criar membro admin | Rollback do grupo criado, propaga erro |
| Falha ao registrar utilização de token | Rollback do PalpiteDobrado, propaga erro |

### API Externa

| Cenário | Comportamento |
|---------|---------------|
| Rodada indisponível na API | Pula rodada, continua com as demais |
| API completamente indisponível | Retorna resultados parciais das rodadas bem-sucedidas |

### Processamento Concorrente

| Cenário | Comportamento |
|---------|---------------|
| Falha em um grupo durante processamento | Loga erro, continua processando demais grupos |
| Todos os grupos falham | Loga todos os erros, não lança exceção |

## Correctness Properties

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas de um sistema — essencialmente, uma declaração formal sobre o que o sistema deve fazer. Propriedades servem como ponte entre especificações legíveis por humanos e garantias de correção verificáveis por máquina.*

### Property 1: Equivalência da busca otimizada por rodadas

*Para qualquer* conjunto de IDs de jogos com rodadas conhecidas, a busca otimizada (apenas rodadas necessárias) DEVE retornar exatamente os mesmos jogos que a busca exaustiva (todas as 38 rodadas), desde que as rodadas estejam disponíveis na API.

**Validates: Requirements 1.1, 1.2**

### Property 2: Resiliência a falhas parciais da API externa

*Para qualquer* conjunto de rodadas onde algumas falham e outras retornam dados, o resultado DEVE conter todos os jogos das rodadas bem-sucedidas e nenhum erro deve ser propagado ao chamador.

**Validates: Requirements 1.3**

### Property 3: Equivalência da query batch de jogos finalizados

*Para qualquer* lista de IDs de fase, o método `buscarFinalizadosPorFases(faseIds)` DEVE retornar exatamente o mesmo conjunto de jogos que a união de chamadas individuais `buscarPorFase(faseId).filter(FINALIZADO)` para cada fase.

**Validates: Requirements 2.1, 2.2**

### Property 4: Equivalência das operações batch de tokens

*Para qualquer* conjunto de membros, motivos e referências, a busca batch `buscarPorChaves(keys)` DEVE retornar exatamente os mesmos tokens que chamadas individuais `buscarPorChave(...)` para cada chave, e `criarVarios(data)` DEVE produzir o mesmo estado final que chamadas individuais `criar(...)` para cada item.

**Validates: Requirements 3.1, 3.2, 4.1, 4.2, 5.1, 5.2**

### Property 5: Equivalência do processamento concorrente de grupos

*Para qualquer* jogo finalizado com N grupos associados, o processamento concorrente via `Promise.allSettled` DEVE produzir o mesmo estado final (tokens concedidos, pontuações calculadas) que o processamento sequencial via `for...of`, independente da ordem de execução.

**Validates: Requirements 6.1**

### Property 6: Isolamento de erros entre grupos

*Para qualquer* conjunto de grupos onde K grupos falham durante o processamento, os (N-K) grupos restantes DEVEM ser processados com sucesso e seus tokens/pontuações DEVEM estar corretos.

**Validates: Requirements 6.2**

### Property 7: Equivalência do batch insert de palpites

*Para qualquer* lista de dados de palpites válidos, `criarVarios(data)` DEVE criar todos os palpites e cada um DEVE ser recuperável individualmente via `buscarPorUsuarioEJogo`, com os mesmos valores de `golsCasa` e `golsFora` fornecidos.

**Validates: Requirements 7.1, 7.2**

### Property 8: Consistência do cache de ranking

*Para qualquer* grupo e fase, se o cache contém um resultado válido (dentro do TTL e sem invalidação), o valor retornado pelo cache DEVE ser idêntico ao resultado que seria calculado do zero com os mesmos dados subjacentes.

**Validates: Requirements 8.1, 8.3**

### Property 9: Invalidação correta do cache

*Para qualquer* jogo finalizado pertencente a uma fase de uma temporada, após a finalização, o cache de ranking de todos os grupos associados àquela temporada DEVE estar vazio (invalidado), forçando recálculo na próxima consulta.

**Validates: Requirements 8.2**

### Property 10: Atomicidade da criação de grupo

*Para qualquer* operação de criação de grupo, se a inserção do membro admin falhar, o grupo NÃO DEVE existir no banco de dados (rollback completo). Se ambas operações tiverem sucesso, tanto o grupo quanto o membro admin DEVEM existir.

**Validates: Requirements 10.1, 10.2**

### Property 11: Atomicidade da ativação de palpite dobrado

*Para qualquer* ativação de palpite dobrado, se o registro de utilização do token falhar, o PalpiteDobrado NÃO DEVE existir no banco de dados (rollback completo). Se ambas operações tiverem sucesso, tanto o PalpiteDobrado quanto o registro de utilização DEVEM existir.

**Validates: Requirements 11.1, 11.2**

### Property 12: Aplicação de rate limiting

*Para qualquer* sequência de requisições de um mesmo IP/usuário que exceda o limite configurado (5/min login, 3/min recuperação, 100/min geral), todas as requisições além do limite DEVEM receber resposta HTTP 429 com header `Retry-After` presente.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

### Property 13: Equivalência funcional do GroupRoleGuard refatorado

*Para qualquer* combinação de usuário, grupo e roles requeridas, o GroupRoleGuard refatorado (usando GrupoUsuarioRepository) DEVE produzir exatamente a mesma decisão de autorização (permitir/negar) que a implementação original (usando PrismaService diretamente).

**Validates: Requirements 15.1, 15.2**

### Property 14: Processamento único do DomainExceptionFilter

*Para qualquer* DomainError lançado durante o processamento de uma requisição, a resposta HTTP DEVE conter exatamente uma instância da mensagem de erro formatada, sem duplicação.

**Validates: Requirements 16.1, 16.2**

### Property 15: Correção da paginação

*Para qualquer* dataset de tamanho N e parâmetros page/pageSize válidos, a resposta DEVE conter no máximo `pageSize` itens, o campo `total` DEVE ser igual a N, `totalPages` DEVE ser igual a `ceil(N/pageSize)`, e a união de todas as páginas DEVE conter exatamente todos os N itens sem duplicatas e sem omissões.

**Validates: Requirements 18.1, 18.2**

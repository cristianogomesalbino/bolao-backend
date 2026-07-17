# Design: Módulo Scheduler

## Visão Geral da Arquitetura

```
src/modules/scheduler/
├── scheduler.module.ts                  # NestJS module (importa ScheduleModule)
├── scheduler.constants.ts               # Intervalos, crons, configs
├── scheduler.controller.ts              # GET /scheduler/status, POST /scheduler/executar/:useCase
├── schedulers/
│   ├── sincronizacao.scheduler.ts       # setTimeout adaptativo → ExecutarSincronizacao
│   ├── notificacao.scheduler.ts         # @Cron → ExecutarNotificacoes
│   └── manutencao.scheduler.ts          # @Cron → ExecutarLimpeza + chamar eventos.processarPendentes
├── use-cases/
│   ├── executar-sincronizacao.ts        # Lógica única de sync (lock + API + reconciliação)
│   ├── executar-notificacoes.ts         # Lembretes, palpites pendentes, jogos do dia
│   └── executar-limpeza.ts             # Notificações antigas, logs antigos
└── services/
    ├── advisory-lock.service.ts         # pg_advisory_lock / pg_try_advisory_lock
    └── sync-policy.service.ts           # Função pura: estado → intervalo

src/modules/eventos/
├── eventos.module.ts                    # Módulo independente de outbox/event processing
├── eventos.constants.ts                 # Tipos de evento, max tentativas
├── services/
│   └── evento-pendente.service.ts       # Registrar, processar, retry
├── processors/
│   ├── ranking.processor.ts            # Processa RANKING_PROCESSAR
│   ├── notificacao.processor.ts        # Processa NOTIFICACAO_ENVIAR
│   └── chaveamento.processor.ts        # Processa CHAVEAMENTO_PROPAGAR
└── repositories/
    ├── evento-pendente.repository.interface.ts
    └── prisma-evento-pendente.repository.ts
```

---

## Componentes Principais

### 1. SchedulerModule

```typescript
@Module({
  imports: [
    ScheduleModule.forRoot(),
    JogosModule,
    NotificacoesModule,
    RankingModule,
    EventosModule,  // Módulo independente de outbox
    PrismaModule,
  ],
  controllers: [SchedulerController],
  providers: [
    // Schedulers
    SincronizacaoScheduler,
    NotificacaoScheduler,
    ManutencaoScheduler,
    // Use Cases
    ExecutarSincronizacao,
    ExecutarNotificacoes,
    ExecutarLimpeza,
    // Services
    AdvisoryLockService,
    SyncPolicyService,
  ],
  exports: [ExecutarSincronizacao],
})
export class SchedulerModule {}
```

---

### 2. Use Case: ExecutarSincronizacao

Principal ponto de entrada unificado. Qualquer trigger chama este use case.

```typescript
interface ExecutarSincronizacaoInput {
  trigger: 'CRON' | 'SUPER_ADMIN' | 'API_KEY';
  campeonatoSlug?: string;  // Se especificado, sincroniza apenas este
  faseId?: string;          // Se especificado, sincroniza apenas esta fase
}

interface ExecutarSincronizacaoOutput {
  syncId: string;
  trigger: string;
  duracaoMs: number;
  sincronizados: number;
  falhas: number;
  eventosGerados: number;
  ignorado: boolean;        // true se lock não foi obtido
}
```

**Fluxo interno:**
1. Gerar `syncId` (UUID)
2. Tentar adquirir advisory lock
3. Se não obteve → log + return `{ ignorado: true }`
4. Detectar estado dos jogos (em andamento, próximos, adiados)
5. Buscar fases para sincronizar
6. Para cada fase: chamar API externa → reconciliar jogos
7. Para cada jogo com mudança de status: registrar `EventoPendente`
8. Processar eventos pendentes imediatamente (ranking, notificações, chaveamento)
9. Liberar lock em `finally`
10. Registrar log com `syncId` + resumo

---

### 3. Advisory Lock Service

```typescript
@Injectable()
export class AdvisoryLockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tenta adquirir lock transacional (liberado automaticamente ao fim da transação).
   * Usa pg_try_advisory_xact_lock para evitar problemas com connection pooling.
   * Deve ser chamado DENTRO de uma $transaction.
   */
  async tryXactLock(lockId: number, tx: PrismaTransactionClient): Promise<boolean> {
    const result = await tx.$queryRaw<[{ locked: boolean }]>`
      SELECT pg_try_advisory_xact_lock(${lockId}) as locked
    `;
    return result[0].locked;
  }
}
```

**Uso no use case:**
```typescript
await this.prisma.$transaction(async (tx) => {
  const obteve = await this.lockService.tryXactLock(LOCK_IDS.SINCRONIZACAO, tx);
  if (!obteve) { /* ignorar */ return; }
  // ... executar sync (lock liberado automaticamente ao fim da transaction)
});
```

**Lock IDs fixos:**
| Lock ID | Operação |
|---------|----------|
| 1 | Sincronização de placares |
| 2 | Processamento de eventos pendentes |

---

### 4. Módulo Eventos (Outbox Pattern Local) — `src/modules/eventos/`

Módulo **independente** do Scheduler. O Scheduler apenas chama `eventoPendenteService.processarPendentes()`.
O domínio (JogoService, RankingService) registra eventos via `eventoPendenteService.registrar()`.

**Schema Prisma:**
```prisma
model EventoPendente {
  id                  String   @id @default(uuid())
  tipo                String   // RANKING_PROCESSAR, NOTIFICACAO_ENVIAR, CHAVEAMENTO_PROPAGAR
  chaveIdempotencia   String   @unique
  payload             Json
  status              String   @default("PENDENTE") // PENDENTE, PROCESSANDO, PROCESSADO, FALHA_DEFINITIVA
  tentativas          Int      @default(0)
  ultimoErro          String?
  syncId              String?  // UUID da execução que gerou o evento
  criadoEm            DateTime @default(now())
  processadoEm        DateTime?
  atualizadoEm        DateTime @updatedAt

  @@index([status])
  @@index([tipo, status])
}
```

**Chaves de idempotência — cada evento constrói a sua:**

Cada tipo de evento define sua própria chave incluindo dados que diferenciam ocorrências legítimas:

| Tipo | Exemplo de chave | Por que |
|------|-----------------|---------|
| `RANKING_PROCESSAR` | `ranking:{jogoId}:{grupoId}` | Um jogo só precisa ser processado 1x por grupo |
| `NOTIFICACAO_ENVIAR` | `notif:{tipo}:{jogoId}:{usuarioId}:{referenciaEvento}` | Jogo reagendado 2x gera 2 notificações legítimas (referenciaEvento diferente) |
| `CHAVEAMENTO_PROPAGAR` | `chave:{temporadaId}:{faseId}:{syncId}` | Cada sync pode tentar propagar, mas só 1x efetivo |

**Ciclo de vida:**
```
PENDENTE → PROCESSANDO → PROCESSADO
                       → PENDENTE (retry, tentativas < 3)
                       → FALHA_DEFINITIVA (tentativas >= 3)
```

**Processors:** cada tipo tem um processor em `src/modules/eventos/processors/` que sabe como executar o efeito.

---

### 5. Sync Policy Service

Função pura que determina o próximo intervalo de sync baseado no estado.

```typescript
interface EstadoJogos {
  jogosEmAndamento: number;
  proximoJogoEm: number | null;  // ms até o próximo jogo
  temAdiados: boolean;
  ultimaSyncMs: number;          // timestamp da última sync
}

function calcularIntervaloSync(estado: EstadoJogos): number {
  // Jogos ao vivo → 2 minutos
  if (estado.jogosEmAndamento > 0) return 2 * 60 * 1000;

  // Próximo jogo dentro de 5min → 2 minutos (preparar)
  if (estado.proximoJogoEm !== null && estado.proximoJogoEm <= 5 * 60 * 1000) {
    return 2 * 60 * 1000;
  }

  // Próximo jogo existe mas longe → acordar 5min antes
  if (estado.proximoJogoEm !== null) {
    const acordarEm = estado.proximoJogoEm - 5 * 60 * 1000;
    return Math.min(acordarEm, 2 * 60 * 60 * 1000); // máx 2h
  }

  // Sem jogos próximos → verificar a cada 2h
  return 2 * 60 * 60 * 1000;
}
```

---

### 6. Schedulers

#### SincronizacaoScheduler

Substitui `SincronizacaoAutomaticaService`. Usa setTimeout adaptativo (não cron fixo).

```typescript
@Injectable()
export class SincronizacaoScheduler implements OnModuleInit {
  private timeout: NodeJS.Timeout | null = null;

  onModuleInit() {
    if (!habilitado) return;
    setTimeout(() => this.ciclo(), 10_000); // startup delay
  }

  private async ciclo() {
    await this.executarSincronizacao.execute({ trigger: 'CRON' });
    const intervalo = this.syncPolicy.calcularProximoIntervalo();
    this.timeout = setTimeout(() => this.ciclo(), intervalo);
  }
}
```

#### NotificacaoScheduler

Move os 4 `@Cron` do `NotificacaoCronService` para cá.

```typescript
@Injectable()
export class NotificacaoScheduler {
  @Cron('0 11 * * *')           // 08:00 BRT
  async agendarJogosDoDia() {
    await this.executarNotificacoes.agendarJogosDoDia({ trigger: 'CRON' });
  }

  @Cron('*/15 11-23,0-4 * * *') // Fallback 15min
  async fallbackIminentes() {
    await this.executarNotificacoes.verificarIminentes({ trigger: 'CRON' });
  }

  @Cron('0,30 11-23,0-4 * * *') // 30min
  async palpitesPendentes() {
    await this.executarNotificacoes.processarPendentes({ trigger: 'CRON' });
  }
}
```

#### ManutencaoScheduler

```typescript
@Injectable()
export class ManutencaoScheduler {
  @Cron('0 5 * * *')            // 02:00 BRT — limpeza diária
  async limparDados() {
    await this.executarLimpeza.execute({ trigger: 'CRON' });
  }

  @Cron('*/5 * * * *')          // 5min — processar eventos pendentes
  async processarEventosPendentes() {
    await this.eventoPendenteService.processarPendentes();
  }
}
```

---

### 7. Controller

```typescript
const USE_CASES_PERMITIDOS = ['sincronizacao', 'notificacoes', 'limpeza', 'eventos-pendentes'] as const;
type UseCasePermitido = typeof USE_CASES_PERMITIDOS[number];

@ApiTags('Scheduler')
@Controller('scheduler')
@UseGuards(SuperAdminGuard)
export class SchedulerController {
  @Get('status')
  async obterStatus() {
    return {
      habilitado: true,
      sincronizacao: this.sincScheduler.obterEstado(),
      notificacoes: { proximoCron: '...' },
      eventosPendentes: await this.eventoPendenteService.contarPendentes(),
    };
  }

  @Post('executar/:useCase')
  async executar(@Param('useCase') useCase: string) {
    if (!USE_CASES_PERMITIDOS.includes(useCase as UseCasePermitido)) {
      throw new BadRequestException(
        `Use case inválido. Permitidos: ${USE_CASES_PERMITIDOS.join(', ')}`,
      );
    }

    switch (useCase) {
      case 'sincronizacao':
        return this.executarSincronizacao.execute({ trigger: 'SUPER_ADMIN' });
      case 'notificacoes':
        return this.executarNotificacoes.executarTudo({ trigger: 'SUPER_ADMIN' });
      case 'limpeza':
        return this.executarLimpeza.execute({ trigger: 'SUPER_ADMIN' });
      case 'eventos-pendentes':
        return this.eventoPendenteService.processarPendentes();
    }
  }
}
```

---

## Máquina de Estados na Sincronização (JOB-009)

A reconciliação de status usa o mesmo mapa `TRANSICOES_VALIDAS` do domínio:

```typescript
function validarTransicaoSync(statusAtual: string, statusApi: string): string | null {
  if (statusAtual === statusApi) return null; // sem mudança
  if (!TRANSICOES_VALIDAS[statusAtual]?.includes(statusApi)) {
    // Log: transição inválida ignorada
    return null;
  }
  return statusApi; // transição válida
}
```

---

## Timeout e Retry da API Externa (JOB-007)

Responsabilidade dividida:
- **FutebolApiService (client)**: faz request → retry → esgotou → lança `ApiExternaIndisponivelError`
- **ExecutarSincronizacao (use case)**: decide se continua com próximos jogos ou aborta

```typescript
const API_CONFIG = {
  TIMEOUT_MS: 10_000,
  MAX_RETRIES: 2,
  BACKOFF: [1000, 3000],
  ERROS_RETRYABLE: [408, 429, 500, 502, 503, 504],
  ERROS_DEFINITIVOS: [400, 401, 403, 404],
} as const;
```

**Client (FutebolApiService):**
```typescript
async buscarComRetry(url: string): Promise<Response> {
  for (let tentativa = 0; tentativa <= API_CONFIG.MAX_RETRIES; tentativa++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
      });
      if (response.ok) return response;
      if (API_CONFIG.ERROS_DEFINITIVOS.includes(response.status)) {
        throw new ApiExternaIndisponivelError();
      }
      if (tentativa < API_CONFIG.MAX_RETRIES) {
        await sleep(API_CONFIG.BACKOFF[tentativa]);
      }
    } catch (error) {
      if (error instanceof ApiExternaIndisponivelError) throw error;
      if (tentativa >= API_CONFIG.MAX_RETRIES) {
        throw new ApiExternaIndisponivelError();
      }
      await sleep(API_CONFIG.BACKOFF[tentativa]);
    }
  }
  throw new ApiExternaIndisponivelError();
}
```

**Use case (ExecutarSincronizacao):**
```typescript
for (const fase of fasesParaSync) {
  try {
    await this.sincronizarFase(fase);
  } catch (error) {
    if (error instanceof ApiExternaIndisponivelError) {
      this.logger.warn(`[SCHEDULER:${syncId}] API indisponível para fase ${fase.id}, continuando...`);
      continue; // Continua com próximas fases
    }
    throw error; // Erros inesperados propagam
  }
}
```

---

## Plano de Migração (Incremental)

### Fase 1: Criar infraestrutura (sem remover nada)
- Criar `SchedulerModule`, `AdvisoryLockService`, `EventoPendenteService`, `SyncPolicyService`
- Criar tabela `EventoPendente` (migration)
- Criar use cases delegando para os services existentes
- Criar `SchedulerController`

### Fase 2: Migrar SincronizacaoAutomaticaService
- `SincronizacaoScheduler` assume o scheduling
- `ExecutarSincronizacao` assume a lógica (delega pro JogoService)
- Remover `SincronizacaoAutomaticaService`

### Fase 3: Migrar NotificacaoCronService
- `NotificacaoScheduler` assume os @Cron
- `ExecutarNotificacoes` orquestra
- Remover `NotificacaoCronService`

### Fase 4: Ativar outbox + idempotência
- Jogo finalizado → registra `EventoPendente` em vez de chamar diretamente
- `ManutencaoScheduler` processa pendentes
- Adicionar constraints de idempotência em `Notificacao` e `TokenDobro`

---

## Diagrama de Fluxo (Pós-Migração)

```
Triggers
├── CRON (SincronizacaoScheduler)
├── SUPER_ADMIN (SchedulerController)
└── API_KEY (SchedulerController)
         ↓
  ExecutarSincronizacao
         ↓
  Advisory Lock (pg_try_advisory_lock)
         ↓ (obteve)
  API Futebol (com timeout/retry)
         ↓
  Reconciliação Jogos (máquina de estados)
         ↓
  Registrar EventosPendentes
         ↓
  Processar Efeitos (ranking, notificações, chaveamento)
         ↓
  Log consolidado com syncId
         ↓
  Liberar lock
```

---

## Decisões de Design

| Decisão | Justificativa |
|---------|---------------|
| Advisory lock via PostgreSQL (não Redis) | Funciona entre múltiplas instâncias desde que compartilhem o mesmo banco — atende Render com 2+ instâncias |
| Outbox local em módulo `eventos/` (não fila distribuída) | Volume baixo, retry simples é suficiente. Scheduler não é dono dos eventos |
| setTimeout adaptativo (não cron fixo) | Policy de frequência precisa ser dinâmica |
| Use cases como classes injetáveis | Testáveis isoladamente, podem ter dependências |
| Eventos pendentes processados a cada 5min | Equilíbrio entre latência e overhead |
| Migração em 4 fases | Cada fase é deployável, sem big-bang |
| Client lança erro tipado, use case decide fluxo | Separação de responsabilidade: client não sabe do contexto da sync |

---

## Padrões de Qualidade Obrigatórios

Toda task desta spec deve respeitar:

1. **Zero `any`** — tipagem forte em todos os arquivos criados/modificados. Interfaces próprias para cada retorno.
2. **Zero erros de lint/Prettier** — `getDiagnostics` limpo antes de considerar pronto.
3. **Reaproveitamento** — não duplicar lógica existente. Importar e reutilizar helpers, constantes e tipos já definidos.
4. **Arquivos < 300 linhas** — dividir em arquivos menores se ultrapassar.
5. **Early returns** — sem ifs aninhados. Máximo 1 nível.
6. **Testes junto com o código** — cada use case e service criado deve ter spec correspondente.
7. **Nomes descritivos** — em português para entidades/mensagens, em inglês para padrões NestJS (Controller, Service, Module, Guard).
8. **Readonly e const** — marcar membros que não mudam, usar `as const` em objetos de configuração.
9. **Complexidade cognitiva ≤ 15** — extrair helpers privados quando necessário.
10. **Documentação no steering** — ao finalizar, atualizar `project-overview.md` com o novo módulo.

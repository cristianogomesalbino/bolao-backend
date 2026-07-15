# Tasks: Módulo Scheduler

## Fase 1 — Infraestrutura Base

### Task 1: Criar estrutura do módulo e constantes
- [ ] Criar `src/modules/scheduler/scheduler.module.ts` com imports básicos (ScheduleModule, PrismaModule)
- [ ] Criar `src/modules/scheduler/scheduler.constants.ts` com:
  - Lock IDs (SYNC = 1, EVENTOS = 2)
  - Intervalos (ao vivo, próximo, sem jogos, adiados)
  - Triggers type (`'CRON' | 'SUPER_ADMIN' | 'API_KEY'`)
  - Mensagens de log
- [ ] Registrar `SchedulerModule` no `AppModule`
- [ ] Validar: getDiagnostics 0 erros, build OK

### Task 2: Criar AdvisoryLockService
- [ ] Criar `src/modules/scheduler/services/advisory-lock.service.ts`
  - Método `tryLock(lockId: number): Promise<boolean>` — usa `pg_try_advisory_lock`
  - Método `unlock(lockId: number): Promise<void>` — usa `pg_advisory_unlock`
  - Tipagem forte (sem any), injeção de PrismaService
- [ ] Criar `test/modules/scheduler/advisory-lock.service.spec.ts`
  - Teste: tryLock retorna true na primeira chamada
  - Teste: tryLock retorna false se já em uso (mock)
  - Teste: unlock libera o lock
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 3: Criar SyncPolicyService (função pura de intervalo)
- [ ] Criar `src/modules/scheduler/services/sync-policy.service.ts`
  - Interface `EstadoJogos` tipada (jogosEmAndamento, proximoJogoEm, temAdiados)
  - Método `calcularIntervalo(estado: EstadoJogos): number`
  - Lógica: ao vivo → 2min, próximo <5min → 2min, próximo longe → acordar antes, sem jogos → 2h
- [ ] Criar `test/modules/scheduler/sync-policy.service.spec.ts`
  - Teste cada cenário da policy com valores concretos
  - Mínimo 6 cenários (todos os branches)
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 4: Criar módulo Eventos (outbox) — `src/modules/eventos/`
- [ ] Criar `src/modules/eventos/eventos.module.ts` com providers e exports
- [ ] Criar `src/modules/eventos/eventos.constants.ts` (tipos de evento, max tentativas = 3)
- [ ] Criar migration Prisma para tabela `EventoPendente`:
  - id, tipo, chaveIdempotencia (UNIQUE), payload (Json), status, tentativas, ultimoErro, syncId, criadoEm, processadoEm, atualizadoEm
  - Índices: status, (tipo + status)
- [ ] Criar `src/modules/eventos/repositories/evento-pendente.repository.interface.ts`
  - Interface tipada com métodos: criar, buscarPendentes, marcarProcessando, marcarProcessado, marcarFalha, contarPendentes
- [ ] Criar `src/modules/eventos/repositories/prisma-evento-pendente.repository.ts`
- [ ] Criar InMemory para testes
- [ ] Registrar no EventosModule com token de injeção
- [ ] Validar: getDiagnostics 0 erros, migration aplicável

### Task 5: Criar EventoPendenteService e Processors
- [ ] Criar `src/modules/eventos/services/evento-pendente.service.ts`
  - Método `registrar(tipo, chaveIdempotencia, payload, syncId)` — upsert idempotente (ON CONFLICT DO NOTHING)
  - Método `processarPendentes()` — busca pendentes, processa via processor correto, marca resultado
  - Método `contarPendentes(): Promise<{ pendentes, falhas }>` — para endpoint de status
  - Limite de 3 tentativas → FALHA_DEFINITIVA
  - Log por evento processado/falhado
- [ ] Criar `src/modules/eventos/processors/ranking.processor.ts` — delega pro RankingService
- [ ] Criar `src/modules/eventos/processors/notificacao.processor.ts` — delega pro NotificacaoEventService
- [ ] Criar `src/modules/eventos/processors/chaveamento.processor.ts` — delega pro ChaveamentoService
- [ ] Criar `test/modules/eventos/evento-pendente.service.spec.ts`
  - Teste: registrar cria evento PENDENTE
  - Teste: registrar com mesma chave não duplica (idempotente)
  - Teste: processarPendentes executa e marca PROCESSADO
  - Teste: 3 falhas → FALHA_DEFINITIVA
- [ ] Validar: getDiagnostics 0 erros, testes passando

---

## Fase 2 — Use Cases

### Task 6: Criar ExecutarSincronizacao use case
- [ ] Criar `src/modules/scheduler/use-cases/executar-sincronizacao.ts`
  - Interface `ExecutarSincronizacaoInput` (trigger, campeonatoSlug?, faseId?)
  - Interface `ExecutarSincronizacaoOutput` (syncId, trigger, duracaoMs, sincronizados, falhas, eventosGerados, ignorado)
  - Fluxo: gerar syncId → tryLock → detectar estado → buscar fases → chamar JogoService.sincronizarPlacares → registrar eventos → liberar lock
  - Log com syncId em cada etapa
  - Delega lógica pesada pro JogoService existente (não duplica)
- [ ] Criar `test/modules/scheduler/executar-sincronizacao.spec.ts`
  - Teste: execução normal retorna resultado com syncId
  - Teste: lock ocupado retorna ignorado=true
  - Teste: erro libera lock no finally
  - Teste: trigger é registrado no output
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 7: Criar ExecutarNotificacoes use case
- [ ] Criar `src/modules/scheduler/use-cases/executar-notificacoes.ts`
  - Métodos: `agendarJogosDoDia`, `verificarIminentes`, `processarPendentes`, `executarTudo`
  - Delega para `NotificacaoEventService` existente
  - Cada método recebe `{ trigger }` para log
- [ ] Criar `test/modules/scheduler/executar-notificacoes.spec.ts`
  - Teste: cada método delega corretamente
  - Teste: erros são logados e não propagados (graceful)
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 8: Criar ExecutarLimpeza use case
- [ ] Criar `src/modules/scheduler/use-cases/executar-limpeza.ts`
  - Método `execute({ trigger })` — limpa notificações antigas + logs de sync antigos + eventos FALHA_DEFINITIVA com 30+ dias
  - Delega para `NotificacaoService.limparAntigas()` existente
- [ ] Criar `test/modules/scheduler/executar-limpeza.spec.ts`
- [ ] Validar: getDiagnostics 0 erros, testes passando

---

## Fase 3 — Schedulers e Controller

### Task 9: Criar SincronizacaoScheduler
- [ ] Criar `src/modules/scheduler/schedulers/sincronizacao.scheduler.ts`
  - OnModuleInit com delay de 10s
  - Ciclo adaptativo via setTimeout (usa SyncPolicyService)
  - Chama `ExecutarSincronizacao.execute({ trigger: 'CRON' })`
  - Env var `SYNC_AUTOMATICA_HABILITADA` controla ativação
  - Env var `SYNC_CAMPEONATOS` passada como input
- [ ] Criar `test/modules/scheduler/sincronizacao.scheduler.spec.ts`
  - Teste: não inicia se desabilitado
  - Teste: chama execute com trigger CRON
  - Teste: reagenda com intervalo da policy
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 10: Criar NotificacaoScheduler
- [ ] Criar `src/modules/scheduler/schedulers/notificacao.scheduler.ts`
  - 4 métodos @Cron (mesmos horários atuais)
  - Cada um delega para `ExecutarNotificacoes`
  - Guard contra processamento duplicado (flag `processando`)
- [ ] Criar `test/modules/scheduler/notificacao.scheduler.spec.ts`
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 11: Criar ManutencaoScheduler
- [ ] Criar `src/modules/scheduler/schedulers/manutencao.scheduler.ts`
  - `@Cron('0 5 * * *')` → ExecutarLimpeza
  - `@Cron('*/5 * * * *')` → `EventoPendenteService.processarPendentes()` (importado do EventosModule)
- [ ] Criar `test/modules/scheduler/manutencao.scheduler.spec.ts`
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 12: Criar SchedulerController
- [ ] Criar `src/modules/scheduler/scheduler.controller.ts`
  - `GET /scheduler/status` — retorna estado de todos os jobs + eventos pendentes
  - `POST /scheduler/executar/:useCase` — força execução (switch: sincronizacao, notificacoes, limpeza)
  - Protegido por `SuperAdminGuard`
  - Swagger: @ApiTags, @ApiOperation, @ApiResponse
- [ ] Criar `test/modules/scheduler/scheduler.controller.spec.ts`
- [ ] Validar: getDiagnostics 0 erros, testes passando

---

## Fase 4 — Migração e Limpeza

### Task 13: Migrar sync — remover SincronizacaoAutomaticaService
- [ ] Remover `src/modules/jogos/services/sincronizacao-automatica.service.ts`
- [ ] Remover referências no `JogosModule` (provider, export)
- [ ] Atualizar endpoint `POST /fases/:faseId/jogos/sincronizar` para chamar `ExecutarSincronizacao.execute({ trigger: 'SUPER_ADMIN', faseId, campeonatoSlug })`
- [ ] Remover constante `CRON_VERIFICACAO` não usada de `jogos.constants.ts`
- [ ] Atualizar testes do controller de jogos se necessário
- [ ] Validar: getDiagnostics 0 erros, testes passando, build OK

### Task 14: Migrar notificações — remover NotificacaoCronService
- [ ] Remover `src/modules/notificacoes/services/notificacao-cron.service.ts`
- [ ] Remover referências no `NotificacoesModule`
- [ ] Garantir que `NotificacaoEventService` continua exposto para o `ExecutarNotificacoes`
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 15: Integrar outbox nos efeitos derivados
- [ ] No `JogoService.sincronizarPlacares` (ou no use case): ao finalizar jogo, chamar `eventoPendenteService.registrar()` (importado do `EventosModule`) para:
  - `RANKING_PROCESSAR` para cada grupo da temporada (chave: `ranking:{jogoId}:{grupoId}`)
  - `NOTIFICACAO_ENVIAR` para notificações de jogo finalizado (chave: `notif:{tipo}:{jogoId}:{usuarioId}:{referenciaEvento}`)
  - `CHAVEAMENTO_PROPAGAR` quando aplicável (chave: `chave:{temporadaId}:{faseId}:{syncId}`)
- [ ] `ManutencaoScheduler` processa pendentes a cada 5min (já implementado na Task 11)
- [ ] Adicionar constraint UNIQUE em `Notificacao` para `chaveIdempotencia` (campo novo, cada tipo constrói sua chave)
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 16: Implementar timeout/retry na API externa
- [x] Adicionar constantes `API_CONFIG` (timeout, max retries, backoff, erros retryable/definitivos)
- [x] Refatorar `FutebolApiService.buscarJogosPorRodada` para usar `AbortSignal.timeout` + retry com backoff
- [x] Atualizar testes do `FutebolApiService` para cobrir cenários de timeout e retry
- [x] Validar: getDiagnostics 0 erros, testes passando

### Task 17: Validar máquina de estados na sync
- [ ] No `JogoService.processarJogoSync`: validar transição via `TRANSICOES_VALIDAS` antes de aplicar status da API
- [ ] Transição inválida: log warn + ignorar (não aplicar)
- [ ] Teste: API retorna AGENDADO para jogo EM_ANDAMENTO → status mantido
- [ ] Validar: getDiagnostics 0 erros, testes passando

### Task 18: Atualizar documentação
- [x] Atualizar `project-overview.md` com novo módulo Scheduler (estrutura, endpoints, env vars)
- [x] Remover referências ao `SincronizacaoAutomaticaService` e `NotificacaoCronService` dos steerings
- [x] Atualizar `README.md` com novos endpoints `/scheduler/*`
- [x] Atualizar Postman collection com endpoints do scheduler

# Requirements: Módulo Scheduler (Centralização de Jobs)

## Contexto

Hoje os jobs agendados estão espalhados por múltiplos módulos:
- `NotificacaoCronService` — dentro do módulo de notificações
- `SincronizacaoAutomaticaService` — dentro do módulo de jogos (scheduling adaptativo via setTimeout)
- Constantes de intervalos em `jogos.constants.ts`

O endpoint manual de sincronização (`POST /fases/:faseId/jogos/sincronizar`) e o cron automático percorrem caminhos diferentes, sem garantia de consistência. Auditoria externa identificou 11 achados (JOB-001 a JOB-011) relacionados a concorrência, idempotência, falha parcial e observabilidade.

## Glossário

- **Trigger**: origem da execução (CRON, SUPER_ADMIN, API_KEY)
- **Use Case**: lógica de negócio única chamada por qualquer trigger
- **Scheduler**: componente que decide **quando** disparar um use case
- **Advisory Lock**: lock de banco PostgreSQL que impede execução simultânea
- **syncId**: UUID gerado por execução para correlacionar todos os logs do fluxo
- **Evento Pendente**: registro de efeito derivado que precisa ser processado (outbox pattern local)

---

## Requisitos Funcionais

### Requirement 1: Módulo SchedulerModule

**User Story:** Como desenvolvedor, eu quero um módulo centralizado de scheduling, para que todos os jobs do sistema estejam visíveis e gerenciáveis em um único lugar.

#### Acceptance Criteria

1. Existe módulo `src/modules/scheduler/scheduler.module.ts` que importa `ScheduleModule.forRoot()`
2. O módulo expõe schedulers por domínio: `SincronizacaoScheduler`, `NotificacaoScheduler`, `ManutencaoScheduler`
3. Os módulos de domínio (jogos, notificações) não importam `@nestjs/schedule` diretamente
4. Variável `SCHEDULER_HABILITADO` controla ativação global (default: true)

---

### Requirement 2: Use Cases unificados por trigger

**User Story:** Como operador do sistema, eu quero que CRON, endpoint admin e API key chamem a mesma lógica de sincronização, para que o resultado seja consistente independente de quem disparou.

#### Acceptance Criteria

1. Existe `ExecutarSincronizacao` use case com método `execute({ trigger, campeonatoSlug?, faseId? })`
2. O scheduler chama `execute({ trigger: 'CRON' })`
3. O endpoint admin chama `execute({ trigger: 'SUPER_ADMIN', faseId, campeonatoSlug })`
4. Ambos produzem o mesmo fluxo: API externa → reconciliação → efeitos derivados
5. O trigger é registrado no log de execução para auditoria
6. `ExecutarNotificacoes` e `ExecutarLimpeza` seguem o mesmo padrão

---

### Requirement 3: Lock de execução contra concorrência (JOB-001)

**User Story:** Como operador, eu quero que duas sincronizações não rodem ao mesmo tempo, para evitar duplicação de efeitos derivados (notificações, fichas, ranking).

#### Acceptance Criteria

1. Use case `ExecutarSincronizacao` adquire PostgreSQL advisory lock antes de executar
2. Usar `pg_try_advisory_xact_lock` dentro de uma `$transaction` do Prisma — lock liberado automaticamente ao fim da transação (evita problemas com connection pooling)
3. Se o lock já está em uso, a execução é ignorada com log `[SCHEDULER] {trigger} → sincronização já em execução, ignorada`
4. Teste: dois triggers simultâneos resultam em apenas uma execução efetiva

---

### Requirement 4: Idempotência end-to-end (JOB-002)

**User Story:** Como desenvolvedor, eu quero que executar a sincronização duas vezes sobre o mesmo estado externo produza o mesmo resultado, para que reprocessamento seja seguro.

#### Acceptance Criteria

1. Propriedade: `sync(sync(externalState)) == sync(externalState)` para dados persistidos
2. `TokenDobro` usa constraint UNIQUE para evitar duplicação em check-then-insert
3. Notificações usam `chaveIdempotencia` como campo UNIQUE — cada evento constrói sua própria chave incluindo dados que diferenciam ocorrências legítimas (ex: `JOGO_REAGENDADO:{jogoId}:{usuarioId}:{novaDataHora}`)
4. Teste de integração: mesma fixture API executada 2x produz estado final idêntico

---

### Requirement 5: Efeitos derivados recuperáveis (JOB-003)

**User Story:** Como operador, eu quero que se o ranking falhar após um jogo ser finalizado, o efeito pendente seja reprocessado na próxima execução, para que nenhum efeito seja perdido.

#### Acceptance Criteria

1. Criar módulo separado `src/modules/eventos/` — responsável por registrar e processar eventos pendentes (outbox local)
2. O módulo Scheduler **não** é dono dos eventos — apenas chama `EventoPendenteService.processarPendentes()`
3. Após atualizar status de um jogo, o domínio (JogoService) registra evento pendente via `EventoPendenteService` (importado do `EventosModule`). A dependência é `JogosModule → EventosModule`, não o inverso.
4. Eventos pendentes: `RANKING_PROCESSAR`, `NOTIFICACAO_ENVIAR`, `CHAVEAMENTO_PROPAGAR`
5. Tabela `EventoPendente` com campos: id, tipo, chaveIdempotencia (UNIQUE), payload, status, tentativas, ultimoErro, syncId, criadoEm, processadoEm
6. Eventos com 3+ falhas são marcados como `FALHA_DEFINITIVA` com alerta no log
7. Processors específicos por tipo de evento ficam em `src/modules/eventos/processors/`

---

### Requirement 6: Resultado estruturado com retry (JOB-004)

**User Story:** Como operador, eu quero saber quais grupos falharam no processamento de ranking, para que falhas parciais sejam observáveis e reprocessáveis.

#### Acceptance Criteria

1. Use case de ranking retorna `{ sucesso: string[], falhas: { grupoId, erro }[] }`
2. Falhas são registradas como eventos pendentes para retry
3. O log inclui contagem de sucessos e falhas: `[SCHEDULER] ranking: 4 ok, 1 falha`

---

### Requirement 7: Máquina de estados na sincronização (JOB-009)

**User Story:** Como desenvolvedor, eu quero que a sincronização respeite a máquina de estados do domínio, para que a API externa não cause regressão de status (ex: EM_ANDAMENTO → AGENDADO).

#### Acceptance Criteria

1. Toda mudança de status vinda da API passa pela mesma validação `TRANSICOES_VALIDAS`
2. Transições inválidas são logadas e ignoradas (não aplicadas)
3. Não existe caminho privilegiado "veio da API, então pode"
4. Teste: API retorna AGENDADO para jogo EM_ANDAMENTO → status mantido

---

### Requirement 8: Observabilidade com syncId (JOB-010)

**User Story:** Como operador, eu quero correlacionar todos os logs de uma execução de sincronização, para diagnosticar problemas rapidamente.

#### Acceptance Criteria

1. Cada execução gera UUID (`syncId`) incluído em todos os logs do fluxo
2. Formato: `[SCHEDULER:{syncId}] {mensagem}`
3. Resumo final registrado: syncId, duracaoMs, jogosRecebidos, jogosAtualizados, eventosGerados, falhas
4. O `syncId` é salvo no log de sincronização no banco

---

### Requirement 9: Policy de frequência orientada por estado (JOB-006)

**User Story:** Como operador, eu quero que a frequência de sincronização se adapte ao estado dos jogos, para não desperdiçar requests quando não há atividade.

#### Acceptance Criteria

1. Existe função `calcularIntervaloSync(estado)` testável isoladamente
2. Estados e intervalos: ao vivo (2min), próximo em <5min (2min), próximo em >5min (acordar na hora), sem jogos próximos (verificar a cada 2h), verificação de adiados (24h)
3. A policy não está espalhada em condicionais — é uma função pura com input/output claro

---

### Requirement 10: Timeout e retry da API externa (JOB-007)

**User Story:** Como desenvolvedor, eu quero que chamadas à API externa tenham timeout e retry definidos, para que uma API lenta não bloqueie o sistema.

#### Acceptance Criteria

1. Timeout de 10s por request à API do GE
2. Retry: máximo 2 tentativas com backoff (1s, 3s)
3. Erros 429: respeitar Retry-After
4. Erros 5xx: retry limitado
5. Erros 4xx de contrato: não repetir
6. Timeout: retry limitado
7. Após esgotar retries, lançar `ApiExternaIndisponivelError` (erro tipado)
8. **Quem decide** se continua com próximos jogos ou aborta a sync é o `ExecutarSincronizacao` (não o client HTTP)
9. O client (`FutebolApiService`) apenas faz request → retry → esgotou → lança erro tipado

---

### Requirement 11: Endpoints administrativos do scheduler

**User Story:** Como SUPER_ADMIN, eu quero ver o status dos jobs e forçar execução manual, para operar o sistema sem precisar de acesso ao servidor.

#### Acceptance Criteria

1. `GET /scheduler/status` retorna estado de todos os jobs (habilitado, última execução, próxima, trigger)
2. `POST /scheduler/executar/:useCase` força execução (trigger: SUPER_ADMIN)
3. `:useCase` validado contra enum fixo: `SINCRONIZACAO | NOTIFICACOES | LIMPEZA | EVENTOS_PENDENTES`. Qualquer outro valor → 400.
4. Ambos protegidos por `SuperAdminGuard`
5. Resposta inclui resultado da execução (sincronizados, falhas, duração)

---

## Requisitos Não-Funcionais

### RNF-01: Sem breaking changes
- Endpoints existentes continuam funcionando (delegam pro use case internamente)
- Comportamento externo idêntico ao atual para o frontend

### RNF-02: Migração incremental
- Fase 1: criar módulo scheduler + use cases (coexiste com services antigos)
- Fase 2: migrar schedulers, remover services antigos
- Cada fase é deployável independentemente

### RNF-03: Testabilidade
- Use cases testáveis isoladamente (sem scheduling)
- Policy de frequência testável como função pura
- Teste de idempotência com fixture estática

### RNF-04: Sem infraestrutura adicional
- Sem Redis, Kafka, RabbitMQ
- Advisory lock via PostgreSQL
- Outbox local via tabela no mesmo banco
- Monólito modular mantido

---

## Fora de escopo (futuro)

- Lock externo via Redis — fora de escopo; PostgreSQL advisory lock atende enquanto as instâncias compartilham o mesmo banco
- Queue/worker separado (Bull, BullMQ) — overkill para volume atual
- Dashboard visual de jobs — endpoint de status é suficiente
- Reconciliação por diff de campos irrelevantes (JOB-008) — resolver quando houver casos reais

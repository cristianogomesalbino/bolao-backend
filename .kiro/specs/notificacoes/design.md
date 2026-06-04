# Technical Design — Módulo de Notificações

## Overview

Módulo composto por dois subsistemas complementares (in-app + web push) integrado ao backend existente via event-driven hooks nos fluxos de finalização de jogos e jobs agendados (cron). O módulo segue os mesmos padrões de Repository Pattern, Domain Errors e Presenters do projeto.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NotificacoesModule                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────┐ │
│  │ NotificacaoController│ │  PushController     │ │ PreferenciaCon│ │
│  │ (CRUD in-app)       │  │ (subscribe/unsub)   │ │ (prefs CRUD) │ │
│  └──────────┬──────────┘  └──────────┬──────────┘ └──────┬───────┘ │
│             │                         │                    │         │
│  ┌──────────▼──────────────────────────▼────────────────────▼──────┐│
│  │                   NotificacaoService                             ││
│  │  - criar / criarLote / listar / marcarLida / marcarTodasLidas   ││
│  └──────────┬──────────────────────────────────────────────────────┘│
│             │                                                       │
│  ┌──────────▼──────────┐  ┌─────────────────────────┐              │
│  │    PushService       │  │  PreferenciaService      │              │
│  │  - enviar push       │  │  - buscar / atualizar    │              │
│  │  - cleanup inválidas │  │  - verificar habilitado  │              │
│  └──────────────────────┘  └─────────────────────────┘              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              NotificacaoEventService                             ││
│  │  - jogoProximo (chamado pelo cron)                              ││
│  │  - rodadaEncerrada (chamado após finalização)                   ││
│  │  - acertoEmCheio (chamado após finalização)                     ││
│  │  - mudancaPosicao (chamado após finalização)                    ││
│  │  - palpitesPendentes (chamado pelo cron)                        ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              NotificacaoCronService (@nestjs/schedule)           ││
│  │  - @Cron('*/1 * * * *') verificarJogosProximos                  ││
│  │  - @Cron('*/30 * * * *') verificarPalpitesPendentes             ││
│  │  - @Cron('0 5 * * *') limparNotificacoesAntigas                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  Repositories:                                                      │
│  ┌──────────────────┐ ┌────────────────────┐ ┌───────────────────┐ │
│  │NotificacaoRepo   │ │InscricaoPushRepo   │ │PreferenciaRepo    │ │
│  │(interface+prisma │ │(interface+prisma   │ │(interface+prisma  │ │
│  │ +in-memory)      │ │ +in-memory)        │ │ +in-memory)       │ │
│  └──────────────────┘ └────────────────────┘ └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Integração com módulos existentes

O `NotificacaoEventService` é chamado por:
1. **JogoService** (após `finalizar` e `sincronizarPlacares` quando status → FINALIZADO)
2. **NotificacaoCronService** (jobs agendados para jogo próximo e palpites pendentes)

Não usamos NestJS EventEmitter para manter sincronia e simplicidade — as notificações são efeitos colaterais diretos dos fluxos existentes.

---

## Data Models

### Novas tabelas (Prisma)

```prisma
enum TipoNotificacao {
  JOGO_PROXIMO
  RODADA_ENCERRADA
  ACERTO_EM_CHEIO
  SUBIU_POSICAO
  DESCEU_POSICAO
  PALPITES_PENDENTES
}

enum StatusNotificacao {
  NAO_LIDA
  LIDA
}

model Notificacao {
  id           String            @id @default(uuid())
  tipo         TipoNotificacao
  titulo       String            @db.VarChar(100)
  mensagem     String            @db.VarChar(500)
  status       StatusNotificacao @default(NAO_LIDA)
  usuarioId    String
  jogoId       String?
  grupoId      String?
  faseId       String?
  rodada       Int?
  dataCriacao  DateTime          @default(now())
  dataLeitura  DateTime?

  usuario      Usuario           @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId, status, dataCriacao])
  @@index([usuarioId, dataCriacao])
  @@index([jogoId, tipo])
  @@index([faseId, rodada, tipo])
}

model InscricaoPush {
  id           String   @id @default(uuid())
  usuarioId    String
  endpoint     String   @db.VarChar(2048)
  p256dh       String   @db.VarChar(128)
  auth         String   @db.VarChar(48)
  dataCriacao  DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  usuario      Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@unique([usuarioId, endpoint])
  @@index([usuarioId])
}

model PreferenciaNotificacao {
  id                   String  @id @default(uuid())
  usuarioId            String  @unique
  jogoProximo          Boolean @default(true)
  rodadaEncerrada      Boolean @default(true)
  acertoEmCheio        Boolean @default(true)
  subiuPosicao         Boolean @default(true)
  desceuPosicao        Boolean @default(true)
  palpitesPendentes    Boolean @default(true)

  usuario              Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
}
```

### Alterações no model `Usuario`

```prisma
model Usuario {
  // ... campos existentes ...
  notificacoes          Notificacao[]
  inscricoesPush        InscricaoPush[]
  preferenciaNotificacao PreferenciaNotificacao?
}
```

---

## API Endpoints

### NotificacaoController

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/notificacoes` | Listar notificações do usuário (paginado) | JWT |
| GET | `/notificacoes/nao-lidas/contagem` | Contagem de não lidas | JWT |
| PATCH | `/notificacoes/:id/lida` | Marcar uma como lida | JWT |
| PATCH | `/notificacoes/marcar-todas-lidas` | Marcar todas como lidas | JWT |

#### Query params de `GET /notificacoes`
- `limit` (default: 20, max: 50)
- `offset` (default: 0)
- `status` (opcional: `NAO_LIDA` | `LIDA`)

#### Response de `GET /notificacoes`
```json
{
  "notificacoes": [
    {
      "id": "uuid",
      "tipo": "ACERTO_EM_CHEIO",
      "titulo": "Acerto em cheio!",
      "mensagem": "Você acertou em cheio! Flamengo 2 × 1 Palmeiras (+3 pts)",
      "status": "NAO_LIDA",
      "jogoId": "uuid | null",
      "grupoId": "uuid | null",
      "faseId": "uuid | null",
      "rodada": "number | null",
      "dataCriacao": "2026-06-01T20:00:00.000Z",
      "dataLeitura": null
    }
  ],
  "total": 45,
  "naoLidas": 12
}
```

### PushController

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/push/inscrever` | Registrar subscription | JWT |
| DELETE | `/push/cancelar` | Remover subscription | JWT |

#### Body de `POST /push/inscrever`
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "base64string",
    "auth": "base64string"
  }
}
```

### PreferenciaController

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/notificacoes/preferencias` | Buscar preferências | JWT |
| PATCH | `/notificacoes/preferencias` | Atualizar preferências | JWT |

#### Body de `PATCH /notificacoes/preferencias`
```json
{
  "jogoProximo": true,
  "rodadaEncerrada": true,
  "acertoEmCheio": true,
  "subiuPosicao": false,
  "desceuPosicao": false,
  "palpitesPendentes": true
}
```

---

## Module Structure

```
src/modules/notificacoes/
├── notificacoes.module.ts
├── notificacoes.constants.ts
├── controllers/
│   ├── notificacao.controller.ts
│   ├── push.controller.ts
│   └── preferencia.controller.ts
├── services/
│   ├── notificacao.service.ts
│   ├── notificacao-event.service.ts
│   ├── notificacao-cron.service.ts
│   ├── push.service.ts
│   └── preferencia.service.ts
├── repositories/
│   ├── notificacao.repository.interface.ts
│   ├── prisma-notificacao.repository.ts
│   ├── in-memory-notificacao.repository.ts
│   ├── inscricao-push.repository.interface.ts
│   ├── prisma-inscricao-push.repository.ts
│   ├── in-memory-inscricao-push.repository.ts
│   ├── preferencia.repository.interface.ts
│   ├── prisma-preferencia.repository.ts
│   └── in-memory-preferencia.repository.ts
├── dto/
│   ├── listar-notificacoes.dto.ts
│   ├── inscrever-push.dto.ts
│   ├── cancelar-push.dto.ts
│   └── atualizar-preferencias.dto.ts
└── errors/
    └── notificacoes.errors.ts
```

---

## Components and Interfaces

### Controllers

- **NotificacaoController** — CRUD de notificações in-app (listar, contar não lidas, marcar lida)
- **PushController** — Gerenciar inscrições Web Push (inscrever, cancelar)
- **PreferenciaController** — Preferências de notificação (buscar, atualizar)

### Services

- **NotificacaoService** — Criação, listagem, marcação como lida, limpeza de notificações
- **NotificacaoEventService** — Orquestração de QUANDO criar notificações (lógica de eventos)
- **NotificacaoCronService** — Jobs agendados via `@nestjs/schedule`
- **PushService** — Envio de Web Push via `web-push`, cleanup de inscrições inválidas
- **PreferenciaService** — CRUD de preferências, filtragem de usuários habilitados por tipo

### Repositories

- **NotificacaoRepository** (interface + Prisma + InMemory)
- **InscricaoPushRepository** (interface + Prisma + InMemory)
- **PreferenciaRepository** (interface + Prisma + InMemory)

### DTOs

- **ListarNotificacoesDto** — Query params (limit, offset, status)
- **InscreverPushDto** — Body (endpoint, keys.p256dh, keys.auth)
- **CancelarPushDto** — Body (endpoint)
- **AtualizarPreferenciasDto** — Body (campos booleanos por tipo)

### Domain Errors

- **NotificacaoNaoEncontradaError** (404)
- **LimiteInscricoesPushError** (400)
- **InscricaoPushNaoEncontradaError** (404)
- **TipoNotificacaoInvalidoError** (400)

### Presenter

- **NotificacaoPresenter** — `toHttp()` com seleção positiva de campos

---

## Service Design

### NotificacaoService

Responsável pelo CRUD de notificações in-app.

```typescript
interface NotificacaoService {
  criar(dados: CriarNotificacaoInput): Promise<Notificacao>;
  criarLote(dados: CriarNotificacaoInput[]): Promise<void>;
  listar(usuarioId: string, filtros: ListarFiltros): Promise<ListarResult>;
  contarNaoLidas(usuarioId: string): Promise<number>;
  marcarComoLida(id: string, usuarioId: string): Promise<void>;
  marcarTodasComoLidas(usuarioId: string): Promise<void>;
}

interface CriarNotificacaoInput {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  usuarioId: string;
  jogoId?: string;
  grupoId?: string;
  faseId?: string;
  rodada?: number;
}
```

Após criar notificação(ões), o service chama `PushService.enviarParaUsuarios()` para disparar web push.

### NotificacaoEventService

Orquestra a lógica de negócio de QUANDO criar notificações. Cada método:
1. Busca os dados necessários
2. Filtra usuários pelas preferências
3. Verifica deduplicação (notificação já enviada?)
4. Chama `NotificacaoService.criarLote()`

```typescript
interface NotificacaoEventService {
  // Chamado pelo cron (a cada 1 min)
  processarJogosProximos(): Promise<void>;

  // Chamado pelo cron (a cada 30 min)
  processarPalpitesPendentes(): Promise<void>;

  // Chamado após finalização de jogo
  processarJogoFinalizado(jogoId: string): Promise<void>;
  // Internamente faz:
  //   - verificarAcertosEmCheio(jogo)
  //   - verificarRodadaEncerrada(jogo)
  //   - verificarMudancasPosicao(jogo)
}
```

### NotificacaoCronService

Usa `@nestjs/schedule` para agendar tarefas periódicas.

```typescript
@Injectable()
class NotificacaoCronService {
  private processandoJogosProximos = false;
  private processandoPalpites = false;

  @Cron('*/1 * * * *')  // cada 1 minuto
  async verificarJogosProximos() {
    if (this.processandoJogosProximos) return;
    this.processandoJogosProximos = true;
    try {
      await this.eventService.processarJogosProximos();
    } finally {
      this.processandoJogosProximos = false;
    }
  }

  @Cron('*/30 * * * *')  // cada 30 minutos
  async verificarPalpitesPendentes() {
    if (this.processandoPalpites) return;
    this.processandoPalpites = true;
    try {
      await this.eventService.processarPalpitesPendentes();
    } finally {
      this.processandoPalpites = false;
    }
  }

  @Cron('0 5 * * *')  // 02:00 BRT = 05:00 UTC
  async limparNotificacoesAntigas() {
    await this.notificacaoService.limparAntigas();
  }
}
```

### PushService

Encapsula a biblioteca `web-push` e gerencia envio/cleanup.

```typescript
interface PushService {
  enviarParaUsuario(usuarioId: string, payload: PushPayload): Promise<void>;
  enviarParaUsuarios(usuarioIds: string[], payload: PushPayload): Promise<void>;
  inscrever(usuarioId: string, dados: InscricaoPushInput): Promise<void>;
  cancelar(usuarioId: string, endpoint: string): Promise<void>;
}

interface PushPayload {
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  url?: string;  // deep link para o frontend
}
```

### PreferenciaService

```typescript
interface PreferenciaService {
  buscar(usuarioId: string): Promise<PreferenciaNotificacao>;
  atualizar(usuarioId: string, dados: Partial<PreferenciaCampos>): Promise<void>;
  estaHabilitado(usuarioId: string, tipo: TipoNotificacao): Promise<boolean>;
  filtrarUsuariosHabilitados(usuarioIds: string[], tipo: TipoNotificacao): Promise<string[]>;
}
```

---

## Event Flow: Jogo Finalizado

```
JogoService.finalizar(id, dto)
  └── jogoRepo.atualizar(id, { status: FINALIZADO, ... })
  └── notificacaoEventService.processarJogoFinalizado(id)  ← NOVO
        ├── verificarAcertosEmCheio(jogo)
        │     ├── buscar palpites que batem exatamente
        │     ├── filtrar por preferências
        │     ├── verificar deduplicação (jogoId + tipo)
        │     └── criarLote() + enviar push
        ├── verificarRodadaEncerrada(jogo)
        │     ├── buscar todos jogos da rodada/fase
        │     ├── se todos FINALIZADO|CANCELADO|ADIADO → rodada encerrada
        │     ├── buscar membros dos grupos da temporada
        │     ├── verificar deduplicação (faseId + rodada + tipo)
        │     └── criarLote() + enviar push
        └── verificarMudancasPosicao(jogo)
              ├── capturar ranking ANTES (já calculado no obterRankingGeral)
              ├── re-calcular ranking DEPOIS (inclui o jogo recém finalizado)
              ├── comparar posições
              ├── filtrar mudanças reais
              └── criarLote(SUBIU_POSICAO/DESCEU_POSICAO) + enviar push
```

### Detalhe: Mudança de Posição

O ranking é calculado on-the-fly. Para detectar mudanças:

1. **Antes da finalização**: chamar `rankingService.obterRankingGeral(grupoId)` que retorna posições baseadas nos jogos finalizados ATÉ ANTES deste jogo
2. **Depois da finalização**: chamar novamente — agora inclui o jogo recém finalizado
3. **Comparar**: para cada membro, se `posicaoAntes !== posicaoDepois`, gerar notificação

Porém como o jogo JÁ está finalizado no banco quando `processarJogoFinalizado` é chamado, precisamos de uma abordagem alternativa:

**Solução**: Antes de persistir o status FINALIZADO, capturar o ranking atual (snapshot). Depois de persistir, calcular novamente e comparar.

Modificação no `JogoService.finalizar()`:
```typescript
async finalizar(id: string, dto: FinalizarJogoDto) {
  // ... validações existentes ...
  const jogoFinalizado = await this.finalizarPontosCorridos(jogo, dto); // ou mataMata
  
  // Dispara notificações (async, não bloqueia resposta)
  this.notificacaoEventService
    .processarJogoFinalizado(jogoFinalizado.id)
    .catch((err) => this.logger.error('Erro ao processar notificações', err.stack));
  
  return jogoFinalizado;
}
```

Para o snapshot de ranking:
```typescript
async processarJogoFinalizado(jogoId: string) {
  const jogo = await this.jogoRepo.buscarPorId(jogoId);
  const fase = await this.faseRepo.buscarPorId(jogo.faseId);
  const grupos = await this.grupoRepo.buscarPorTemporadaId(fase.temporadaId);

  for (const grupo of grupos) {
    // Ranking ATUAL (já inclui o jogo finalizado)
    const rankingAtual = await this.rankingService.obterRankingGeral(grupo.id);
    
    // Ranking EXCLUINDO este jogo: usar obterRankingGeral mas excluir jogo
    // Opção: calcular temporariamente sem o jogo via filtro
    const rankingAnterior = await this.calcularRankingExcluindoJogo(grupo.id, jogoId);
    
    // Comparar posições
    this.gerarNotificacoesMudancaPosicao(rankingAnterior, rankingAtual, grupo);
  }
}
```

**Alternativa mais simples**: Usar `obterRankingFase` com `ateRodada = rodada - 1` como "antes" e `ateRodada = rodada` como "depois". Isso funciona apenas para fases com rodadas numeradas.

**Decisão de design**: Calcular ranking geral duas vezes — uma excluindo o jogo finalizado (simulando o "antes") e outra com todos (o "depois"). Para excluir, adicionar um método `obterRankingGeralExcluindoJogo(grupoId, jogoId)` no RankingService que filtra o jogo da lista antes de calcular.

---

## Event Flow: Cron — Jogos Próximos

```
NotificacaoCronService.verificarJogosProximos() [cada 1 min]
  └── NotificacaoEventService.processarJogosProximos()
        ├── buscar jogos AGENDADO com dataHora entre agora e agora+10min
        ├── para cada jogo: verificar se já existe notificação (jogoId + JOGO_PROXIMO)
        ├── buscar temporada → grupos → membros
        ├── filtrar por preferências
        └── criarLote() + enviar push
```

### Deduplicação

Usa o índice `@@index([jogoId, tipo])` na tabela Notificacao. Antes de criar, verifica:
```sql
SELECT 1 FROM "Notificacao" WHERE "jogoId" = $1 AND "tipo" = 'JOGO_PROXIMO' LIMIT 1
```

Se existir, pula. Isso garante que mesmo com cron rodando a cada minuto, cada jogo gera notificação uma única vez.

---

## Event Flow: Cron — Palpites Pendentes

```
NotificacaoCronService.verificarPalpitesPendentes() [cada 30 min]
  └── NotificacaoEventService.processarPalpitesPendentes()
        ├── buscar fases com jogos AGENDADO nas próximas 3h
        ├── para cada fase/rodada:
        │     ├── verificar deduplicação (faseId + rodada + PALPITES_PENDENTES)
        │     ├── buscar temporada → grupos → membros
        │     ├── buscar palpites existentes da rodada
        │     ├── calcular pendentes por membro (totalJogos - palpitesFeitos)
        │     ├── filtrar por preferências
        │     └── criarLote() + enviar push
```

---

## Deduplication Strategy

| Evento | Chave de deduplicação |
|--------|----------------------|
| JOGO_PROXIMO | `jogoId` + tipo |
| RODADA_ENCERRADA | `faseId` + `rodada` + tipo |
| ACERTO_EM_CHEIO | `jogoId` + `grupoId` + `usuarioId` + tipo |
| SUBIU_POSICAO | `jogoId` + `grupoId` + `usuarioId` + tipo |
| DESCEU_POSICAO | `jogoId` + `grupoId` + `usuarioId` + tipo |
| PALPITES_PENDENTES | `faseId` + `rodada` + `grupoId` + `usuarioId` + tipo |

A verificação de duplicação é feita via query no repositório antes de criar.

---

## Repository Interfaces

### NotificacaoRepository

```typescript
export interface NotificacaoRepository {
  criar(data: CriarNotificacaoData): Promise<any>;
  criarVarios(data: CriarNotificacaoData[]): Promise<void>;
  buscarPorId(id: string): Promise<any>;
  listar(usuarioId: string, filtros: ListarFiltros): Promise<any[]>;
  contarPorFiltro(usuarioId: string, filtros: ListarFiltros): Promise<number>;
  contarNaoLidas(usuarioId: string): Promise<number>;
  marcarComoLida(id: string): Promise<void>;
  marcarTodasComoLidas(usuarioId: string): Promise<void>;
  existeNotificacao(filtro: DeduplicacaoFiltro): Promise<boolean>;
  removerAntigas(tipo: 'lidas' | 'naoLidas', diasLimite: number, batchSize: number): Promise<number>;
}
```

### InscricaoPushRepository

```typescript
export interface InscricaoPushRepository {
  criar(data: CriarInscricaoData): Promise<any>;
  atualizar(usuarioId: string, endpoint: string, data: AtualizarInscricaoData): Promise<any>;
  remover(usuarioId: string, endpoint: string): Promise<void>;
  removerPorId(id: string): Promise<void>;
  buscarPorUsuario(usuarioId: string): Promise<any[]>;
  buscarPorEndpoint(usuarioId: string, endpoint: string): Promise<any>;
  contarPorUsuario(usuarioId: string): Promise<number>;
}
```

### PreferenciaRepository

```typescript
export interface PreferenciaRepository {
  buscarPorUsuario(usuarioId: string): Promise<any>;
  criar(data: CriarPreferenciaData): Promise<any>;
  atualizar(usuarioId: string, data: Partial<PreferenciaCampos>): Promise<any>;
  buscarPorUsuarios(usuarioIds: string[]): Promise<any[]>;
}
```

---

## Dependencies (new packages)

| Pacote | Versão | Uso |
|--------|--------|-----|
| `@nestjs/schedule` | ^5.0.0 | Cron jobs |
| `web-push` | ^3.6.0 | Envio de Web Push |
| `@types/web-push` | ^3.6.0 | Tipos (devDependency) |

---

## Constants (`notificacoes.constants.ts`)

```typescript
export const NOTIFICACOES = {
  TAG: 'Notificações',
  NOTIFICACAO_REPOSITORY_TOKEN: 'NOTIFICACAO_REPOSITORY',
  INSCRICAO_PUSH_REPOSITORY_TOKEN: 'INSCRICAO_PUSH_REPOSITORY',
  PREFERENCIA_REPOSITORY_TOKEN: 'PREFERENCIA_REPOSITORY',
  PUSH_SERVICE_TOKEN: 'PUSH_SERVICE',

  LIMITES: {
    TITULO_MAX: 100,
    MENSAGEM_MAX: 500,
    PUSH_TITULO_MAX: 50,
    PUSH_MENSAGEM_MAX: 150,
    INSCRICOES_POR_USUARIO: 10,
    LISTAGEM_LIMIT_DEFAULT: 20,
    LISTAGEM_LIMIT_MAX: 50,
    BATCH_LIMPEZA: 1000,
  },

  CRON: {
    JOGO_PROXIMO_MINUTOS: 10,
    PALPITES_PENDENTES_HORAS: 3,
    LIMPEZA_LIDAS_DIAS: 30,
    LIMPEZA_NAO_LIDAS_DIAS: 90,
  },

  MENSAGENS: {
    NOTIFICACAO_NAO_ENCONTRADA: 'Notificação não encontrada',
    LIMITE_INSCRICOES_ATINGIDO: 'Limite de inscrições push atingido (máximo 10)',
    INSCRICAO_NAO_ENCONTRADA: 'Inscrição push não encontrada',
    TIPO_INVALIDO: 'Tipo de notificação inválido',
    TODAS_MARCADAS_LIDAS: 'Todas as notificações foram marcadas como lidas',
    NOTIFICACAO_MARCADA_LIDA: 'Notificação marcada como lida',
    INSCRICAO_CRIADA: 'Inscrição push registrada com sucesso',
    INSCRICAO_REMOVIDA: 'Inscrição push removida com sucesso',
    PREFERENCIAS_ATUALIZADAS: 'Preferências atualizadas com sucesso',
  },

  TEMPLATES: {
    JOGO_PROXIMO: {
      titulo: 'Jogo em 10 minutos!',
      mensagem: (timeCasa: string, timeFora: string) =>
        `Jogo ${timeCasa} × ${timeFora} começa em 10 minutos!`,
    },
    RODADA_ENCERRADA: {
      titulo: 'Rodada encerrada!',
      mensagem: (rodada: number, faseNome: string) =>
        `A rodada ${rodada} da fase ${faseNome} foi encerrada! Confira o ranking.`,
    },
    ACERTO_EM_CHEIO: {
      titulo: 'Acerto em cheio!',
      mensagem: (timeCasa: string, golsCasa: number, golsFora: number, timeFora: string, pontos: number) =>
        `Você acertou em cheio! ${timeCasa} ${golsCasa} × ${golsFora} ${timeFora} (+${pontos} pts)`,
    },
    SUBIU_POSICAO: {
      titulo: 'Subiu no ranking!',
      mensagem: (posicao: number, grupoNome: string) =>
        `Você subiu para ${posicao}º lugar no grupo ${grupoNome}!`,
    },
    DESCEU_POSICAO: {
      titulo: 'Desceu no ranking',
      mensagem: (posicao: number, grupoNome: string) =>
        `Você caiu para ${posicao}º lugar no grupo ${grupoNome}.`,
    },
    PALPITES_PENDENTES: {
      titulo: 'Palpites pendentes!',
      mensagem: (quantidade: number, rodada: number) =>
        `Faltam ${quantidade} palpites para a rodada ${rodada}! Não esqueça.`,
    },
  },
} as const;
```

---

## Domain Errors

```typescript
// src/common/errors/domain-errors/notificacoes.errors.ts

export class NotificacaoNaoEncontradaError extends DomainError { statusCode = 404; }
export class LimiteInscricoesPushError extends DomainError { statusCode = 400; }
export class InscricaoPushNaoEncontradaError extends DomainError { statusCode = 404; }
export class TipoNotificacaoInvalidoError extends DomainError { statusCode = 400; }
```

---

## Presenter

```typescript
// src/common/presenters/notificacao.presenter.ts

export class NotificacaoPresenter {
  static toHttp(notificacao: any) {
    return {
      id: notificacao.id,
      tipo: notificacao.tipo,
      titulo: notificacao.titulo,
      mensagem: notificacao.mensagem,
      status: notificacao.status,
      jogoId: notificacao.jogoId,
      grupoId: notificacao.grupoId,
      faseId: notificacao.faseId,
      rodada: notificacao.rodada,
      dataCriacao: notificacao.dataCriacao,
      dataLeitura: notificacao.dataLeitura,
    };
  }
}
```

---

## Environment Variables (new)

```env
# Web Push (VAPID keys)
VAPID_PUBLIC_KEY=<base64>
VAPID_PRIVATE_KEY=<base64>
VAPID_SUBJECT=mailto:contato@bolao.app
```

Gerar VAPID keys: `npx web-push generate-vapid-keys`

Validação no `PushService.onModuleInit()`:
```typescript
onModuleInit() {
  if (!this.configService.get('VAPID_PUBLIC_KEY')) {
    this.logger.warn('VAPID_PUBLIC_KEY não configurada — Web Push desabilitado');
  }
}
```

---

## Integration Points (Modifications to existing code)

### 1. `JogoService.finalizar()` — adicionar hook de notificação

```typescript
// Após persistir o status FINALIZADO:
if (this.notificacaoEventService) {
  this.notificacaoEventService
    .processarJogoFinalizado(jogoFinalizado.id)
    .catch((err) => this.logger.error('Erro notificações pós-finalização', err.stack));
}
```

### 2. `JogoService.sincronizarPlacares()` — hook para jogos que transitam para FINALIZADO

No loop de `processarJogoSync`, quando `resultado.novoStatus === 'FINALIZADO'`:
```typescript
if (resultado.novoStatus === 'FINALIZADO') {
  this.notificacaoEventService
    .processarJogoFinalizado(jogo.id)
    .catch((err) => this.logger.error('Erro notificações pós-sync', err.stack));
}
```

### 3. `JogosModule` — importar `NotificacoesModule` ou injetar via token

Para evitar circular dependency, o `NotificacoesModule` importa `JogosModule` (leitura) e o `JogoService` recebe o `NotificacaoEventService` via injection opcional:

```typescript
constructor(
  // ... repos existentes ...
  @Inject(NOTIFICACOES.EVENT_SERVICE_TOKEN) @Optional()
  private readonly notificacaoEventService?: NotificacaoEventService,
)
```

### 4. `RankingService` — adicionar método para ranking excluindo jogo

```typescript
async obterRankingGeralExcluindoJogo(grupoId: string, jogoId: string): Promise<RankingEntry[]> {
  // Igual obterRankingGeral, mas filtra o jogo específico dos finalizados
}
```

### 5. `AppModule` — registrar `ScheduleModule`

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... demais módulos
    NotificacoesModule,
  ],
})
export class AppModule {}
```

---

## Testing Strategy

- **Unit tests** para cada service com InMemory repositories
- **NotificacaoEventService**: testar cada fluxo de evento isoladamente
  - Mock do RankingService para simular rankings antes/depois
  - Mock do PushService
- **NotificacaoCronService**: testar que flags de concorrência funcionam
- **PushService**: mock da lib `web-push`, testar cleanup em 410/404
- **PreferenciaService**: testar filtragem por tipo

---

## Performance Considerations

1. **Batch creation**: `criarVarios` usa `createMany` do Prisma (single query)
2. **Deduplicação com índice**: queries de verificação usam índices compostos
3. **Push assíncrono**: envios de push não bloqueiam response da API
4. **Cron com flag**: evita execuções sobrepostas
5. **Limpeza em batches**: evita locks longos no banco
6. **Preferências em batch**: `buscarPorUsuarios` para evitar N+1 ao filtrar

---

## Migration Plan

1. Criar migration Prisma com os 3 novos models + enum
2. Instalar `@nestjs/schedule`, `web-push`, `@types/web-push`
3. Gerar VAPID keys e configurar `.env`
4. Implementar repositories (interface + Prisma + InMemory)
5. Implementar services (NotificacaoService → PushService → PreferenciaService → EventService → CronService)
6. Implementar controllers + DTOs
7. Integrar com `JogoService.finalizar()` e `sincronizarPlacares()`
8. Registrar `ScheduleModule` no `AppModule`
9. Testes unitários
10. Atualizar Postman collection

---

## Error Handling

| Cenário | Erro | Status | Comportamento |
|---------|------|--------|---------------|
| Notificação não encontrada ou não pertence ao usuário | NotificacaoNaoEncontradaError | 404 | Não revela se existe para outro usuário |
| Marcar notificação já lida | — | 200 | Idempotente, retorna sucesso sem alterar |
| Limite de 10 inscrições push atingido | LimiteInscricoesPushError | 400 | Rejeita nova inscrição |
| Endpoint push não encontrado para cancelar | InscricaoPushNaoEncontradaError | 404 | — |
| Tipo de notificação inválido em preferências | TipoNotificacaoInvalidoError | 400 | — |
| Push retorna 410/404 (inscrição expirada) | — | — | Remove inscrição automaticamente, sem erro para o usuário |
| Push retorna 5xx/timeout | — | — | Loga warning, continua sem retry |
| Cron falha para um jogo/membro específico | — | — | Loga erro, continua processando os demais |
| VAPID keys não configuradas | — | — | Loga warning no startup, push desabilitado silenciosamente |
| Paginação inválida (limit > 50, offset < 0) | ValidationError (class-validator) | 400 | Mensagem indicando valores aceitos |

### Princípios

- Falhas de push NUNCA bloqueiam criação de notificação in-app
- Falhas em cron NUNCA interrompem o ciclo completo
- Notificações são "fire and forget" — se falhar pra um usuário, os demais recebem normalmente
- Domain Errors seguem o padrão existente (`DomainExceptionFilter` captura e formata)

---

## Correctness Properties

### Property 1: Deduplicação de Notificações

- Cada combinação (jogo + tipo) gera no máximo UMA notificação JOGO_PROXIMO por jogo
- Cada combinação (fase + rodada + tipo) gera no máximo UMA notificação RODADA_ENCERRADA
- Cada combinação (jogo + grupo + usuário + tipo) gera no máximo UMA notificação de acerto/posição
- Verificação via `existeNotificacao()` antes de criar, apoiada por índices compostos

### Property 2: Concorrência Segura

- Cron jobs usam flag booleana (`processandoJogosProximos`) para evitar execuções sobrepostas
- `createMany` do Prisma garante atomicidade na criação em lote
- `marcarTodasComoLidas` usa `updateMany` (single query, sem race condition)

### Property 3: Consistência de Estado

- Preferências inexistentes = todos os tipos habilitados (fail-open, não bloqueia notificações)
- Notificação in-app é SEMPRE criada antes do push (push depende da notificação existir)
- Inscrições push inválidas são removidas proativamente (push 410/404) para não acumular lixo

### Property 4: Ordenação Determinística

- Notificações sempre retornadas por `dataCriacao DESC` (mais recentes primeiro)
- Limpeza remove as mais antigas primeiro (LIDA > 30d, NAO_LIDA > 90d)

### Property 5: Isolamento de Dados

- Usuário só vê suas próprias notificações (filtro por `usuarioId` em todas as queries)
- Preferências são por usuário (não por grupo)
- Push failures de um usuário não afetam outros usuários no mesmo batch

---
inclusion: always
---

# Bolão Backend — Visão Geral

API REST para gerenciamento de bolões de campeonatos de futebol.

## Stack

- NestJS 11 com TypeScript
- Prisma ORM 6 com PostgreSQL (Supabase)
- Vitest 4 para testes unitários
- Autenticação JWT (access token 15m + refresh token 7d) com guard global via APP_GUARD
- Swagger em `/docs`
- Repository Pattern (interfaces + Prisma impl + InMemory impl)
- Domain Errors para erros de negócio tipados
- Presenters para transformação de respostas HTTP
- Docker Compose com profiles `dev` (hot reload) e `prod` (build)
- Script `dev` para gerenciar containers: `sh dev start-dev`, `sh dev stop`, `sh dev logs`, `sh dev npm ...`, `sh dev npx ...`
- Em desenvolvimento usar `sh dev start-dev` (hot reload, sem rebuild)
- Em produção usar `sh dev start-prod` (rebuild da imagem)

## Ambiente de Desenvolvimento (Docker)

O projeto roda 100% dentro de Docker. **NUNCA executar comandos npm/npx diretamente na máquina host** para operações que dependem do banco (migrations, seeds, etc.).

**Exceção:** Testes unitários (`npx vitest run`) podem rodar no host — usam InMemory repositories, não precisam de banco.

- Instalar pacotes: `sh dev npm install <pacote>`
- Rodar testes (via Docker): `sh dev npx vitest run`
- Rodar testes (direto no host): `npx vitest run`
- Rodar qualquer comando npm: `sh dev npm <comando>`
- Rodar qualquer comando npx: `sh dev npx <comando>`
- Logs: `sh dev logs`
- Parar: `sh dev stop`
- Timezone dos containers: `America/Sao_Paulo` (BRT)
- Logging HTTP automático via `LoggerMiddleware` (método, URL, status, tempo)
- Logging de sincronização: formato consolidado 1 linha por sync (campeonato, rodada, resultado, timings, jogos atualizados)

## Estrutura de Módulos

```
src/modules/
├── auth/            # Login, refresh, logout, guards, decorators
├── usuarios/        # CRUD de usuários com bcrypt e soft delete
├── campeonatos/     # Gerenciamento de campeonatos
├── temporadas/      # Temporadas vinculadas a campeonatos (copiar fases)
├── grupos/          # Grupos de bolão (público/privado, código convite)
├── grupo-usuario/   # Membros dos grupos (entrar, sair, remover, alterar role)
├── jogos/           # Jogos, fases, importação via API externa, sincronização
├── palpites/        # Palpites (CRUD, lote), palpite dobrado, painel da rodada
├── times/           # Times (criados automaticamente na importação)
├── ranking/         # Pontuação calculada on-the-fly, ranking por grupo/fase
└── notificacoes/    # Push notifications, lembretes, acertos, ranking changes
```

## Modelos Prisma

- Campeonato → Temporada → Fase → Jogo
- Temporada → Grupo → GrupoUsuario
- Jogo → Palpite, PalpiteDobrado
- Jogo → Time (timeCasa, timeFora — relações nomeadas)
- Usuario (perfil: SUPER_ADMIN | USER)
- GrupoUsuario (role: ADMIN | MEMBER)
- RefreshToken, RecuperacaoSenha
- TokenDobro (fichas de palpite dobrado)

## Regras de Domínio

- Criador do grupo sempre começa como ADMIN
- Roles dentro do grupo são independentes do perfil global do usuário
- Um usuário pode ser ADMIN em um grupo e MEMBER em outro
- Palpites podem ser feitos em jogos com status AGENDADO ou ADIADO
- Um usuário só pode ter 1 palpite por jogo
- Jogos adiados (sem data definida) têm status ADIADO e dataHora null
- Quando um jogo adiado recebe nova data, volta para AGENDADO com foiAdiado = true
- Ranking é calculado on-the-fly (sem tabela de pontuação persistida)
- Pontuação: acerto em cheio (3pts), acerto de resultado (1pt), erro (0pts)
- Palpite dobrado multiplica pontos por 2

## Status de Jogo

```
AGENDADO → EM_ANDAMENTO → FINALIZADO
AGENDADO → ADIADO → AGENDADO (remarcado)
AGENDADO → CANCELADO
ADIADO → CANCELADO
EM_ANDAMENTO → CANCELADO
```

## Importação de Jogos (API Externa)

- Fonte: API do ge.globo.com (pública, sem chave)
- URL base: `https://api.globoesporte.globo.com/tabela/{campeonatoId}/fase/{faseSlug}/rodada/{rodada}/jogos/`
- Horários retornados em BRT (sem timezone) — convertidos para UTC com `-03:00`
- Jogos sem data (`data_realizacao: null`) são importados como ADIADO
- Validação: datas antes de 2020 são tratadas como inválidas → status ADIADO
- Times são criados automaticamente na primeira importação (com escudo da API)

### Campeonatos Suportados

| Slug | campeonatoId (GE) | Fases |
|------|-------------------|-------|
| `brasileirao` | `d1a37fa4-e948-43a6-ba53-ab24ab3a45b1` | 1 fase (PONTOS_CORRIDOS, 38 rodadas) |
| `copa-do-mundo-2026` | `b5ff9c28-476e-4816-a699-7645acc94cd0` | 12 grupos + eliminatórias |

### Arquitetura da Copa do Mundo no Banco

- A "Fase de Grupos" da Copa na API externa (`fase-de-grupos-copa-do-mundo-2026`) é uma única fase que retorna jogos de TODOS os 12 grupos juntos por rodada
- No banco, cada grupo é uma `Fase` separada (Grupo A, Grupo B, ..., Grupo L) com `tipo = PONTOS_CORRIDOS`
- As fases eliminatórias (32 Avos, Oitavas, etc.) são `tipo = MATA_MATA`
- A importação distribui os jogos para a fase correta via `externoId` do jogo na API
- A sincronização detecta automaticamente múltiplas fases do mesmo tipo na mesma temporada e sincroniza TODAS de uma vez (não precisa chamar individualmente por grupo)

### Sincronização de Placares

- Endpoint: `POST /fases/:faseId/jogos/sincronizar`
- Body: `{ campeonatoSlug, faseSlug }`
- **Comportamento multi-grupo:** ao sincronizar uma fase que pertence a uma temporada com múltiplas fases do mesmo tipo (ex: 12 grupos da Copa), o sistema automaticamente sincroniza TODAS as fases equivalentes — basta passar qualquer `faseId` dos grupos
- Filtra jogos com `fonteResultado = API_EXTERNA` e `status != FINALIZADO/CANCELADO`
- Limite de rodada: sincroniza até `rodadaAtual + 1` (evita buscar rodadas futuras distantes)
- Detecta mudança de horário e atualiza `dataHora`
- Jogo adiado que recebe data na API → volta para AGENDADO com `foiAdiado = true`
- Suporte a pênaltis (jogos mata-mata da Copa)
- Fallback: se API externa indisponível, calcula status internamente (baseado em horário)

### Frontend Admin (Tela de Importação)

- Rota: `/admin/importar`
- Ao selecionar "Copa do Mundo 2026" + "Fase de Grupos": o frontend envia o `faseId` do primeiro grupo encontrado (Grupo A), mas o backend sincroniza todos os grupos automaticamente
- Para fases eliminatórias: precisa selecionar a fase destino específica no banco

## Endpoint de Listagem de Jogos

- `GET /fases/:faseId/jogos` — sem `?rodada` retorna a rodada atual (menor rodada com jogos não finalizados)
- `GET /fases/:faseId/jogos?rodada=5` — retorna rodada específica
- `GET /fases/:faseId/jogos?status=ADIADO` — retorna todos os jogos adiados da fase
- Resposta inclui `rodadaAtual`, dados dos times (nome, sigla, escudo) e `foiAdiado`

## Roadmap de Módulos

1. ~~Auth~~ ✅
2. ~~Usuarios~~ ✅
3. ~~Campeonatos~~ ✅
4. ~~Temporadas~~ ✅
5. ~~Grupos~~ ✅
6. ~~GrupoUsuario~~ ✅
7. ~~Jogos~~ ✅
8. ~~Palpites~~ ✅
9. ~~Ranking~~ ✅
10. Planos/Monetização — Limites por plano (max participantes, etc.)

## Idioma

O projeto usa português brasileiro para nomes de entidades, DTOs, mensagens de erro e endpoints.
Nomes de classes, decorators e padrões do NestJS seguem inglês (Controller, Service, Module, Guard).

## Endpoints Adicionais (não listados acima)

### Jogos
- `POST /jogos/importar` — importar jogos da API externa (SUPER_ADMIN). `faseId` vem no body (não na URL)
- `PATCH /jogos/:id/resetar-fonte` — resetar `fonteResultado` para API_EXTERNA
- `GET /jogos/:id` — buscar jogo por ID
- `PATCH /jogos/:id` — atualizar dados de um jogo
- `PATCH /jogos/:id/finalizar` — finalizar jogo com placar
- `GET /classificacao?season=` — classificação do Brasileirão via API externa (FutebolApiService)

### Palpites
- `POST /jogos/:jogoId/palpites` — criar palpite
- `PATCH /palpites/:id` — atualizar palpite
- `DELETE /palpites/:id` — excluir palpite
- `GET /jogos/:jogoId/meu-palpite` — buscar meu palpite por jogo
- `GET /meus-palpites?temporadaId=` — listar todos os meus palpites
- `POST /meus-palpites/por-jogos` — batch: buscar meus palpites para múltiplos jogos
- `POST /palpites/lote` — criar palpites em lote
- `GET /grupos/:grupoId/jogos/:jogoId/palpites` — listar palpites do grupo num jogo
- `GET /grupos/:grupoId/jogos/:jogoId/palpites/estatisticas` — distribuição de palpites

### Ranking
- `GET /grupos/:grupoId/ranking/geral` — ranking geral do grupo
- `GET /grupos/:grupoId/ranking/fases/:faseId?rodada=&ateRodada=` — ranking por fase/rodada
- `GET /grupos/:grupoId/ranking/jogos/:jogoId` — detalhamento de pontuação por jogo
- `GET /grupos/:grupoId/painel-rodada/:faseId` — painel da rodada

### Usuários
- `PATCH /usuarios/me/grupo-favorito` — definir grupo favorito

## Services Especializados

- `PontuacaoService` — cálculo de pontos (cheio 3pts, resultado 1pt, erro 0pts, dobrado ×2)
- `FutebolApiService` — integração com API ge.globo.com + fallback campeonato-brasileiro-api
- `SincronizacaoAutomaticaService` — scheduling adaptativo de sync (2min ao vivo, dorme sem jogos, acorda com antecedência)
- `PainelRodadaService` — agregação de dados para painel da rodada
- `TokenDobroService` — gerenciamento de fichas de palpite dobrado
- `PalpiteDobradoService` — operações de palpite dobrado

## Ranking — Critérios de Desempate

1. Pontuação total (desc)
2. Acertos em cheio (desc)
3. Acertos de resultado (desc)
4. Média da hora do palpite — `mediaPalpiteEm` (quem palpitou mais cedo, asc)
5. Nome alfabético (asc) — fallback final

Cache: 5 minutos em memória (Map-based, TTL 300.000ms)

## Módulo de Notificações

### Arquitetura

Services divididos por responsabilidade (SRP):
- `NotificacaoEventService` — orquestrador: recebe eventos e delega para services especializados
- `NotificacaoAcertoService` — detecta acertos em cheio e notifica usuários
- `NotificacaoRodadaService` — detecta rodada encerrada e notifica
- `NotificacaoRankingService` — calcula mudanças de posição e notifica subidas/descidas
- `NotificacaoLembreteService` — lembrete de jogo próximo + palpites pendentes
- `NotificacaoCronService` — jobs agendados via `@nestjs/schedule`
- `PushService` — envio de Web Push (VAPID/web-push)
- `PreferenciaService` — preferências do usuário por tipo de notificação
- `NotificacaoService` — CRUD de notificações (listar, marcar lida, limpar antigas)

### Tipos de Notificação

| Tipo | Trigger | Quem recebe |
|------|---------|-------------|
| `JOGO_PROXIMO` | 10min antes do jogo | Usuários que NÃO palpitaram |
| `RODADA_ENCERRADA` | Todos os jogos da rodada finalizados | Todos os membros |
| `ACERTO_EM_CHEIO` | Jogo finalizado + palpite exato | Quem acertou |
| `SUBIU_POSICAO` | Jogo finalizado + ranking recalculado | Quem subiu |
| `DESCEU_POSICAO` | Jogo finalizado + ranking recalculado | Quem desceu |
| `PALPITES_PENDENTES` | 3h antes de jogos com palpites faltando | Quem não palpitou |

### Endpoints

- `GET /notificacoes` — listar notificações do usuário (paginado, filtro por status)
- `PATCH /notificacoes/:id/lida` — marcar como lida
- `PATCH /notificacoes/lidas` — marcar todas como lidas
- `POST /push/inscrever` — registrar inscrição push (endpoint + keys)
- `DELETE /push/cancelar` — cancelar inscrição push
- `GET /push/chave-publica` — retornar VAPID public key
- `GET /preferencias` — buscar preferências de notificação do usuário
- `PATCH /preferencias` — atualizar preferências

### Web Push (VAPID)

- Chaves VAPID configuradas via env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Se VAPID não configurado: push desabilitado graciosamente (não bloqueia startup)
- Inscrições inválidas (404/410) são removidas automaticamente
- Limite: 10 inscrições por usuário

### Cron Jobs (UTC)

- `0 11 * * *` (08:00 BRT) — agenda timers para lembretes de jogos do dia
- `*/15 11-23,0-4 * * *` — fallback: verifica jogos iminentes a cada 15min
- `0,30 11-23,0-4 * * *` — verifica palpites pendentes a cada 30min
- `0 5 * * *` (02:00 BRT) — limpeza de notificações antigas (30 dias)

### Deduplicação

Todas as notificações são deduplicadas via `existeNotificacao()` antes de criar. Verifica combinação de `tipo + jogoId/faseId/rodada/grupoId/usuarioId` conforme o tipo.

### Modelos Prisma

- `Notificacao` — tipo, título, mensagem, status (NAO_LIDA/LIDA), relação com usuario/jogo/grupo/fase
- `InscricaoPush` — endpoint, p256dh, auth (unique por usuario+endpoint)
- `PreferenciaNotificacao` — booleans por tipo (unique por usuario)

### Integração com JogoService

`JogoService.dispararNotificacoesJogoFinalizado(jogoId)` chama `NotificacaoEventService.processarJogoFinalizado(jogoId)` de forma fire-and-forget (`.catch()`) após finalizar/sincronizar um jogo. Não bloqueia o fluxo principal.

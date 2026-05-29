---
inclusion: always
---

# Bolão Backend — Visão Geral

API REST para gerenciamento de bolões de campeonatos de futebol.

## Stack

- NestJS 11 com TypeScript
- Prisma ORM 6 com PostgreSQL (Supabase)
- Vitest 4 para testes unitários
- Autenticação JWT (access token 7d + refresh token 7d) com guard global via APP_GUARD
- Swagger em `/docs`
- Repository Pattern (interfaces + Prisma impl + InMemory impl)
- Domain Errors para erros de negócio tipados
- Presenters para transformação de respostas HTTP
- Docker Compose com profiles `dev` (hot reload) e `prod` (build)
- Script `dev` para gerenciar containers: `sh dev start-dev`, `sh dev stop`, `sh dev logs`, `sh dev npm ...`, `sh dev npx ...`
- Em desenvolvimento usar `sh dev start-dev` (hot reload, sem rebuild)
- Em produção usar `sh dev start-prod` (rebuild da imagem)

## Ambiente de Desenvolvimento (Docker)

O projeto roda 100% dentro de Docker. **NUNCA executar comandos npm/npx diretamente na máquina host.**

- Instalar pacotes: `sh dev npm install <pacote>`
- Rodar testes: `sh dev npx vitest run`
- Rodar qualquer comando npm: `sh dev npm <comando>`
- Rodar qualquer comando npx: `sh dev npx <comando>`
- Logs: `sh dev logs`
- Parar: `sh dev stop`
- Timezone dos containers: `America/Sao_Paulo` (BRT)
- Logging HTTP automático via `LoggerMiddleware` (método, URL, status, tempo)

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
└── ranking/         # Pontuação calculada on-the-fly, ranking por grupo/fase
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
- Palpites só podem ser feitos antes do jogo começar (status = AGENDADO)
- Um usuário só pode ter 1 palpite por jogo
- Jogos adiados (sem data definida) têm status ADIADO e dataHora null
- Quando um jogo adiado recebe nova data, volta para AGENDADO com foiAdiado = true
- Ranking é calculado on-the-fly (sem tabela de pontuação persistida)
- Pontuação: acerto em cheio (10pts), acerto de resultado (5pts), acerto de gols de 1 time (3pts)
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
- Horários retornados em BRT (sem timezone) — convertidos para UTC com `-03:00`
- Jogos sem data (`data_realizacao: null`) são importados como ADIADO
- Validação: datas antes de 2020 são tratadas como inválidas → status ADIADO
- Sincronização de placares: atualiza status e placar de jogos com fonteResultado = API_EXTERNA
- Times são criados automaticamente na primeira importação (com escudo da API)

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

# Bolão Backend

API REST para gerenciamento de bolões de campeonatos de futebol.

## Tecnologias

- NestJS 11
- Prisma ORM 6
- PostgreSQL (Supabase)
- Vitest 4 (testes unitários)
- Docker Compose (profiles dev/prod)
- TypeScript
- JWT (autenticação com guard global via APP_GUARD)
- Swagger (documentação)

## Estrutura do Projeto

```
src/
├── modules/
│   ├── auth/               # Autenticação (login, refresh, logout, recuperação de senha)
│   ├── usuarios/           # Cadastro e gerenciamento de usuários
│   ├── campeonatos/        # Gerenciamento de campeonatos
│   ├── temporadas/         # Temporadas dos campeonatos
│   ├── grupos/             # Grupos de bolão
│   ├── grupo-usuario/      # Membros dos grupos (adicionar, remover, convite)
│   ├── jogos/              # Fases, jogos, integração API de futebol
│   ├── palpites/           # Palpites universais, palpite dobrado, token dobro
│   └── ranking/            # Pontuação, ranking por fase/geral, detalhamento
├── common/
│   ├── constants/          # Constantes globais (roles)
│   ├── decorators/         # @Public(), @CurrentUser(), @GroupRoles()
│   ├── errors/             # ErrorFactory + DomainError + domain errors por módulo
│   ├── filters/            # Exception filters (HTTP, Prisma, DomainException)
│   ├── middleware/         # LoggerMiddleware (log de requisições HTTP)
│   ├── pipes/              # Custom pipes (UUID validation)
│   └── presenters/         # Presenters com toHttp() por entidade
└── prisma/                 # Prisma service e configurações
```

Cada módulo segue a estrutura:
```
src/modules/{modulo}/
├── repositories/           # Interface + Prisma impl + InMemory impl
├── {modulo}.constants.ts   # TAG, MENSAGENS, REPOSITORY_TOKEN
├── {modulo}.service.ts     # Lógica de negócio (injeta repositórios)
├── {modulo}.controller.ts  # Rotas HTTP (usa Presenters)
├── {modulo}.module.ts      # Registro de providers
├── {modulo}.service.spec.ts # Testes com InMemory repositories
└── dto/                    # DTOs com class-validator
```

## Pré-requisitos

- Node.js 22+
- Docker e Docker Compose
- Conta no Supabase (ou PostgreSQL local)

## Configuração

1. Clone o repositório

2. Crie o arquivo `.env` na raiz:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/database
JWT_SECRET=sua_chave_secreta
JWT_REFRESH_SECRET=sua_chave_refresh_secreta
```

## Desenvolvimento

Usar o script `dev` para gerenciar os containers:

```bash
sh dev start-dev       # Inicia em modo dev (hot reload)
sh dev stop            # Para os containers
sh dev logs            # Acompanha os logs
sh dev status          # Status dos containers
sh dev npm <comando>   # Executa npm dentro do container
sh dev npx <comando>   # Executa npx dentro do container
sh dev build           # Rebuilda as imagens
```

A API estará disponível em `http://localhost:3002`.

Documentação Swagger em `http://localhost:3002/docs`.

> Timezone dos containers: `America/Sao_Paulo` (logs e datas em BRT).

## Logs

Todas as requisições HTTP são logadas automaticamente via `LoggerMiddleware`:

```
[Nest] [HTTP] GET /campeonatos 200 - 12ms
[Nest] [HTTP] POST /auth/login 401 - 5ms
[Nest] [HTTP] GET /jogos/abc 404 - 3ms
```

- Nível `LOG` para 2xx/3xx, `WARN` para 4xx, `ERROR` para 5xx
- Inclui método, URL completa (com query params), status code e tempo de resposta

## Produção

```bash
sh dev start-prod      # Build e inicia em modo produção
```

> O projeto usa `network_mode: host`. As migrations são executadas automaticamente ao iniciar em produção.

## Endpoints

### Autenticação (`/auth`)

| Método | Rota                    | Descrição                    | Auth |
|--------|-------------------------|------------------------------|------|
| POST   | `/auth/login`           | Login                        | Não  |
| POST   | `/auth/refresh`         | Renovar token                | Não  |
| POST   | `/auth/logout`          | Logout                       | JWT  |
| POST   | `/auth/esqueci-senha`   | Solicitar recuperação de senha | Não  |
| POST   | `/auth/resetar-senha`   | Resetar senha com token      | Não  |

### Usuários (`/usuarios`)

| Método | Rota             | Descrição              | Auth |
|--------|------------------|------------------------|------|
| POST   | `/usuarios`      | Criar usuário          | Não  |
| GET    | `/usuarios/me`   | Perfil autenticado     | JWT  |
| GET    | `/usuarios/:id`  | Buscar por ID          | JWT  |
| PATCH  | `/usuarios/:id`  | Atualizar usuário      | JWT  |
| DELETE | `/usuarios/:id`  | Desativar usuário      | JWT  |

### Campeonatos (`/campeonatos`)

| Método | Rota              | Descrição              | Auth |
|--------|-------------------|------------------------|------|
| POST   | `/campeonatos`    | Criar campeonato       | JWT  |
| GET    | `/campeonatos`    | Listar campeonatos     | JWT  |

### Temporadas (`/temporadas`)

| Método | Rota              | Descrição              | Auth |
|--------|-------------------|------------------------|------|
| POST   | `/temporadas`     | Criar temporada        | JWT  |
| GET    | `/temporadas`     | Listar temporadas      | JWT  |

### Grupos (`/grupos`)

| Método | Rota                              | Descrição              | Auth       |
|--------|-----------------------------------|------------------------|------------|
| POST   | `/grupos`                         | Criar grupo            | JWT        |
| GET    | `/grupos`                         | Listar grupos ativos   | JWT        |
| GET    | `/grupos/:grupoId`                | Buscar por ID          | JWT        |
| PATCH  | `/grupos/:grupoId`                | Atualizar grupo        | JWT + Admin|
| PATCH  | `/grupos/:grupoId/status`         | Ativar/desativar       | JWT + Admin|
| PATCH  | `/grupos/:grupoId/regenerar-convite` | Regenerar código convite | JWT + Admin|
| DELETE | `/grupos/:grupoId`                | Excluir grupo inativo  | JWT + Admin|


### Membros do Grupo (`/grupos`)

| Método | Rota                                    | Descrição                    | Auth          |
|--------|-----------------------------------------|------------------------------|---------------|
| POST   | `/grupos/entrar`                        | Entrar por código de convite | JWT           |
| POST   | `/grupos/:grupoId/adicionar`            | Adicionar membro por email   | JWT + Admin   |
| GET    | `/grupos/:grupoId/membros`              | Listar membros do grupo      | JWT + Membro  |
| DELETE | `/grupos/:grupoId/sair`                 | Sair do grupo                | JWT + Membro  |
| DELETE | `/grupos/:grupoId/usuarios/:usuarioId`  | Remover membro               | JWT + Admin   |
| PATCH  | `/grupos/:grupoId/usuarios/:usuarioId/cargo` | Alterar role de membro  | JWT + Admin   |

### Palpites (`/palpites`, `/jogos/:jogoId/palpites`)

| Método | Rota                                              | Descrição                          | Auth          |
|--------|---------------------------------------------------|------------------------------------|---------------|
| POST   | `/jogos/:jogoId/palpites`                         | Criar palpite                      | JWT           |
| POST   | `/palpites/lote`                                  | Criar palpites em lote             | JWT           |
| PATCH  | `/palpites/:id`                                   | Editar palpite                     | JWT           |
| DELETE | `/palpites/:id`                                   | Excluir palpite                    | JWT           |
| GET    | `/jogos/:jogoId/meu-palpite`                      | Buscar meu palpite por jogo        | JWT           |
| GET    | `/meus-palpites`                                  | Listar meus palpites (filtro temporadaId) | JWT     |
| GET    | `/grupos/:grupoId/jogos/:jogoId/palpites`         | Listar palpites do grupo por jogo  | JWT + Membro  |
| GET    | `/grupos/:grupoId/painel-rodada/:faseId`          | Painel da rodada (jogos + palpites + dobros) | JWT + Membro |

### Palpite Dobrado (`/grupos/:grupoId`)

| Método | Rota                                              | Descrição                          | Auth          |
|--------|---------------------------------------------------|------------------------------------|---------------|
| POST   | `/grupos/:grupoId/jogos/:jogoId/dobro`            | Ativar dobro em jogo               | JWT + Membro  |
| DELETE | `/grupos/:grupoId/jogos/:jogoId/dobro`            | Desativar dobro em jogo            | JWT + Membro  |
| GET    | `/grupos/:grupoId/tokens-dobro/saldo`             | Consultar saldo de fichas          | JWT + Membro  |
| GET    | `/grupos/:grupoId/tokens-dobro/historico`          | Consultar histórico de fichas      | JWT + Membro  |
| PATCH  | `/grupos/:grupoId/configuracao-dobro`             | Habilitar/desabilitar dobro        | JWT + Admin   |

### Ranking (`/grupos/:grupoId/ranking`)

| Método | Rota                                                      | Descrição                          | Auth          |
|--------|-----------------------------------------------------------|------------------------------------|---------------|
| GET    | `/grupos/:grupoId/ranking/geral`                          | Ranking geral da temporada         | JWT + Membro  |
| GET    | `/grupos/:grupoId/ranking/fases/:faseId`                  | Ranking por fase (filtros: ?rodada, ?ateRodada) | JWT + Membro  |
| GET    | `/grupos/:grupoId/ranking/jogos/:jogoId`                  | Detalhamento de pontuação por jogo | JWT + Membro  |
| POST   | `/grupos/:grupoId/ranking/processar-jogo/:jogoId`         | Processar pontuação de jogo        | JWT + Admin   |

**Regras de pontuação:**

| Categoria              | Pontos | Descrição                                                    |
|------------------------|--------|--------------------------------------------------------------|
| Acerto em cheio        | 10     | Placar exato (golsCasa e golsFora iguais)                    |
| Acerto de resultado    | 5      | Resultado correto (vitória/empate/derrota) com placar errado |
| Acerto de gols um time | 3      | Acertou gols de um time, mas errou o resultado               |
| Erro total             | 0      | Nenhum acerto                                                |

- Apenas jogos com status FINALIZADO contam para o ranking
- Considera apenas tempo normal (ignora prorrogação e pênaltis)
- Palpite Dobrado (quando habilitado no grupo) aplica multiplicador 2x nos pontos

**Critérios de desempate (em ordem):**
1. Pontuação total (maior primeiro)
2. Acertos em cheio (maior primeiro)
3. Acertos de resultado (maior primeiro)
4. Nome do usuário (ordem alfabética)

### Fases (`/temporadas/:temporadaId/fases`)

| Método | Rota                                          | Descrição              | Auth |
|--------|-----------------------------------------------|------------------------|------|
| POST   | `/temporadas/:temporadaId/fases`              | Criar fase             | JWT  |
| GET    | `/temporadas/:temporadaId/fases`              | Listar fases           | JWT  |
| GET    | `/temporadas/:temporadaId/fases/:id`          | Buscar fase por ID     | JWT  |

### Jogos (`/fases/:faseId/jogos`, `/jogos`)

| Método | Rota                                          | Descrição                    | Auth              |
|--------|-----------------------------------------------|------------------------------|--------------------|
| POST   | `/fases/:faseId/jogos`                        | Criar jogo                   | JWT                |
| PATCH  | `/jogos/:id`                                  | Atualizar jogo               | JWT                |
| PATCH  | `/jogos/:id/finalizar`                        | Finalizar jogo com placar    | JWT                |
| GET    | `/fases/:faseId/jogos`                        | Listar jogos da fase         | JWT                |
| GET    | `/jogos/:id`                                  | Buscar jogo por ID           | JWT                |
| POST   | `/jogos/importar`                             | Importar jogos (API externa) | JWT + SUPER_ADMIN  |
| POST   | `/fases/:faseId/jogos/sincronizar`            | Sincronizar placares         | JWT + SUPER_ADMIN  |
| PATCH  | `/jogos/:id/resetar-fonte`                    | Resetar fonte resultado      | JWT                |

## Integração com API de Futebol

O módulo de Jogos suporta importação e sincronização de jogos via API do ge.globo.com (Globo Esporte).

Liga suportada:
- Brasileirão Série A

A API não requer autenticação. A integração usa o endpoint público da tabela do Brasileirão.

Funcionalidades:
- Importar jogos de uma rodada específica (1-38) para uma fase
- Sincronizar placares automaticamente via API externa
- Modo híbrido: jogos podem ter `fonteResultado` MANUAL ou API_FOOTBALL
- Edições manuais em jogos importados alteram `fonteResultado` para MANUAL, protegendo contra sobrescrita na sincronização
- Endpoint de reset permite reverter `fonteResultado` para API_FOOTBALL

Transições de status dos jogos:
- `AGENDADO → EM_ANDAMENTO → FINALIZADO`
- `AGENDADO → ADIADO → AGENDADO` (jogo remarcado)
- `AGENDADO → CANCELADO`
- `ADIADO → CANCELADO`
- `EM_ANDAMENTO → CANCELADO`

Jogos adiados:
- Jogos sem data definida na API são importados com status `ADIADO` e `dataHora: null`
- Campo `foiAdiado: true` marca permanentemente que o jogo foi adiado
- Quando a sincronização detecta nova data, o jogo volta para `AGENDADO`
- Front pode filtrar com `GET /fases/:faseId/jogos?status=ADIADO`

Listagem de jogos:
- `GET /fases/:faseId/jogos` sem `?rodada` retorna a rodada atual automaticamente
- Resposta inclui `rodadaAtual` e dados dos times (nome, sigla, escudo)

## Palpites e Palpite Dobrado

Regras de domínio:
- Palpite é universal: um por usuário por jogo, vale para todos os grupos
- Palpites só podem ser criados, editados ou excluídos enquanto o jogo estiver AGENDADO
- Criação em lote via `POST /palpites/lote` (valida cada jogo individualmente, retorna sucesso/erro por item)
- Visibilidade no grupo: palpites de outros membros só são visíveis após o jogo ser FINALIZADO
- Palpite Dobrado é opcional por grupo (campo `permitirPalpiteDobrado`)
- Token Dobro: fichas acumuladas por conquistas (palpites completos na fase, acerto em cheio, primeiro/último no ranking)
- Ativar dobro consome 1 ficha; desativar antes do jogo começar devolve a ficha
- Multiplicador 2x aplicado apenas no contexto do grupo onde o dobro foi ativado

## Testes

```bash
docker exec bolao-backend-dev npx vitest run       # testes unitários
docker exec bolao-backend-dev npx vitest run --coverage  # cobertura
```

> Todos os comandos rodam dentro do Docker. Nunca executar npm/npx diretamente na máquina host.

## Roadmap

1. ~~Auth~~ ✅
2. ~~Usuarios~~ ✅
3. ~~Campeonatos~~ ✅
4. ~~Temporadas~~ ✅
5. ~~Grupos~~ ✅
6. ~~GrupoUsuario~~ ✅
7. ~~Jogos~~ ✅
8. ~~Palpites~~ ✅
9. ~~Ranking~~ ✅

## Licença

MIT

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
│   ├── auth/               # Autenticação (login, refresh, logout)
│   ├── usuarios/           # Cadastro e gerenciamento de usuários
│   ├── campeonatos/        # Gerenciamento de campeonatos
│   ├── temporadas/         # Temporadas dos campeonatos
│   ├── grupos/             # Grupos de bolão
│   └── grupo-usuario/      # Membros dos grupos (adicionar, remover, convite)
├── common/
│   ├── constants/          # Constantes globais (roles)
│   ├── decorators/         # @Public(), @CurrentUser(), @GroupRoles()
│   ├── errors/             # ErrorFactory + DomainError + domain errors por módulo
│   ├── filters/            # Exception filters (HTTP, Prisma, DomainException)
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

## Produção

```bash
sh dev start-prod      # Build e inicia em modo produção
```

> O projeto usa `network_mode: host`. As migrations são executadas automaticamente ao iniciar em produção.

## Endpoints

### Autenticação (`/auth`)

| Método | Rota             | Descrição              | Auth |
|--------|------------------|------------------------|------|
| POST   | `/auth/login`    | Login                  | Não  |
| POST   | `/auth/refresh`  | Renovar token          | Não  |
| POST   | `/auth/logout`   | Logout                 | JWT  |

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

| Método | Rota                      | Descrição              | Auth       |
|--------|---------------------------|------------------------|------------|
| POST   | `/grupos`                 | Criar grupo            | JWT        |
| GET    | `/grupos`                 | Listar grupos ativos   | JWT        |
| GET    | `/grupos/:grupoId`        | Buscar por ID          | JWT        |
| PATCH  | `/grupos/:grupoId`        | Atualizar grupo        | JWT + Admin|
| PATCH  | `/grupos/:grupoId/status` | Ativar/desativar       | JWT + Admin|
| DELETE | `/grupos/:grupoId`        | Excluir grupo inativo  | JWT + Admin|


### Membros do Grupo (`/grupos`)

| Método | Rota                                    | Descrição                    | Auth          |
|--------|-----------------------------------------|------------------------------|---------------|
| POST   | `/grupos/entrar`                        | Entrar por código de convite | JWT           |
| POST   | `/grupos/:grupoId/adicionar`            | Adicionar membro por email   | JWT + Admin   |
| GET    | `/grupos/:grupoId/membros`              | Listar membros do grupo      | JWT + Membro  |
| DELETE | `/grupos/:grupoId/sair`                 | Sair do grupo                | JWT + Membro  |
| DELETE | `/grupos/:grupoId/usuarios/:usuarioId`  | Remover membro               | JWT + Admin   |

## Testes

```bash
docker exec bolao-backend-dev npx vitest run       # testes unitários
docker exec bolao-backend-dev npx vitest run --coverage  # cobertura
```

> Todos os comandos rodam dentro do Docker. Nunca executar npm/npx diretamente na máquina host.

## Licença

MIT

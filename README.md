# Bolão Backend

API REST para gerenciamento de bolões de campeonatos de futebol.

## Tecnologias

- NestJS
- Prisma ORM
- PostgreSQL (Supabase)
- Docker
- TypeScript

## Estrutura do Projeto

```
src/
├── modules/
│   ├── campeonatos/    # Gerenciamento de campeonatos
│   ├── temporadas/     # Temporadas dos campeonatos
│   ├── grupos/         # Grupos de bolão
│   └── usuarios/       # Usuários do sistema
├── common/
│   ├── filters/        # Exception filters
│   └── pipes/          # Custom pipes
└── prisma/             # Prisma service e configurações
```

## Pré-requisitos

- Node.js 22+
- Docker e Docker Compose
- Conta no Supabase (ou PostgreSQL)

## Configuração

1. Clone o repositório

2. Crie o arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/database
```

3. Instale as dependências:

```bash
npm install
```

4. Execute as migrations do Prisma:

```bash
npx prisma migrate dev
```

## Desenvolvimento

```bash
# modo watch
npm run start:dev

# A API estará disponível em http://localhost:3001
```

## Docker

### Build e execução

```bash
# Build e iniciar
docker-compose up --build

# Rodar em background
docker-compose up -d

# Parar
docker-compose down
```

### Observações importantes

- O projeto usa `network_mode: host` para resolver problemas de conectividade IPv6 com Supabase
- As migrations são executadas automaticamente ao iniciar o container
- A aplicação roda na porta 3001

## Testes

```bash
# testes unitários
npm run test

# cobertura de testes
npm run test:cov
```

## Deploy

Para deploy em produção:

1. Configure as variáveis de ambiente no servidor
2. Certifique-se que o banco de dados está acessível
3. Execute:

```bash
docker-compose up -d
```

## Endpoints Principais

- `GET /campeonatos` - Lista campeonatos
- `POST /campeonatos` - Cria campeonato
- `GET /temporadas` - Lista temporadas
- `POST /temporadas` - Cria temporada
- `GET /grupos` - Lista grupos
- `POST /grupos` - Cria grupo

## Project setup

```bash
npm install
```

## Licença

MIT

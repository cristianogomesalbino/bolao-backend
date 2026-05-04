# PROMPT: Criar Estrutura de Testes de API com Playwright (TypeScript)

## Contexto

Preciso que você crie uma estrutura completa de testes de integração de API usando **Playwright (TypeScript)** em um projeto backend. A estrutura deve seguir os mesmos padrões arquiteturais de um projeto de referência que usa Robot Framework, adaptando cada camada para Playwright + TypeScript.

O projeto de referência testa uma API REST (Laravel/PHP) com PostgreSQL, usando Docker para isolar a execução dos testes. A estrutura é altamente organizada em camadas: Base, Database, Routes, Fixtures (DataFactories, MockDataBuilders, SeedBuilders), Seeds, Templates e Specs.

---

## 1. ESTRUTURA DE PASTAS A CRIAR

```
docker/playwright/
├── .env.example
├── .env
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── qa                          # Script CLI para build/run/relatórios
└── bin/
    └── run-tests.sh

tests/Integration/
├── tsconfig.json              # Configuração TypeScript isolada dos testes
├── playwright.config.ts
├── package.json
├── global-setup.ts
├── global-teardown.ts
├── resources/
│   ├── Base/
│   │   ├── api.ts              # Cliente HTTP base, constantes, helpers
│   │   ├── auth.ts             # Autenticação e geração de headers
│   │   ├── constants.ts        # HTTP status codes, variáveis globais
│   │   └── helpers.ts          # Funções utilitárias (equivalente ao Helper.py)
│   ├── Database/
│   │   ├── connection.ts       # Conexão PostgreSQL (pg)
│   │   ├── database.ts         # Schema/table constants + Clean Tests Data
│   │   └── [Entidade]Database.ts  # Ex: UserDatabase.ts, CompanyDatabase.ts
│   ├── Routes/
│   │   └── [Entidade]Route.ts  # Ex: UserRoute.ts, LoginRoute.ts
│   ├── Fixtures/
│   │   ├── DataBuilder.ts      # Orquestrador central de massa de dados
│   │   ├── DataFactories/
│   │   │   └── [Entidade]Factory.ts  # Ex: UserFactory.ts, PersonFactory.ts
│   │   ├── MockDataBuilders/
│   │   │   └── [Entidade]MockDataBuilder.ts  # Payloads e rotas para testes
│   │   └── SeedBuilders/
│   │       └── [Entidade]SuiteSeedBuilder.ts  # Composição de seeds por suite
│   ├── Seeds/
│   │   └── [Entidade]Seed.ts   # Keywords de seeding (orquestra SeedBuilders + Database)
│   └── Templates/
│       └── AttemptRequestsTemplate.ts  # Template reutilizável para testes de permissão
└── specs/
    ├── Healthcheck/
    │   └── healthcheck.spec.ts
    ├── Auth/
    │   └── login.spec.ts
    ├── [Modulo]/
    │   ├── [Entidade].spec.ts
    │   └── AttemptRequests/
    │       └── [Entidade]AttemptRequests.spec.ts
    └── ...

results/                        # Relatórios HTML gerados pelo Playwright
```

---

## 2. DOCKER

### 2.1 Dockerfile (`docker/playwright/Dockerfile`)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

ENV TZ=America/Sao_Paulo
ENV LANG=pt_BR.UTF-8

WORKDIR /opt/tests

# Instala dependências do PostgreSQL client
RUN apt-get update && apt-get install -y \
    postgresql-client \
    locales \
    && sed -i -e 's/# pt_BR.UTF-8 UTF-8/pt_BR.UTF-8 UTF-8/' /etc/locale.gen \
    && dpkg-reconfigure --frontend=noninteractive locales \
    && update-locale LANG=pt_BR.UTF-8 \
    && rm -rf /var/lib/apt/lists/*

COPY tests/Integration/package.json ./
RUN npm install

COPY tests/Integration/ ./

CMD ["npx", "playwright", "test"]
```

### 2.2 docker-compose.yml (`docker/playwright/docker-compose.yml`)

**IMPORTANTE:** A configuração de rede do container de testes DEVE espelhar a do backend do projeto host. Verificar o `docker-compose.yml` do projeto antes de definir.

**Opção A — Backend usa `network_mode: host`:**
Se o backend roda com `network_mode: host`, o container de testes também deve usar `network_mode: host`. Nesse caso, `RESOURCES_URL` aponta para `http://localhost:PORTA/`.

```yaml
services:
  web:
    image: httpd:2.4
    volumes:
      - ../../results:/usr/local/apache2/htdocs/
    ports:
      - "2601:80"
  testes:
    container_name: api-testes-playwright
    build:
      dockerfile: docker/playwright/Dockerfile
      context: ../../
    env_file:
      - .env
    network_mode: host
    volumes:
      - ../../results:/opt/tests/results:Z
      - ../../tests/Integration:/opt/tests:Z
      - /opt/tests/node_modules
    environment:
      - CI=true
```

**Opção B — Backend usa rede Docker nomeada (ex: traefik_network):**
Se o backend roda em uma rede Docker nomeada, o container de testes deve entrar na mesma rede. Nesse caso, `RESOURCES_URL` aponta para `http://NOME_DO_CONTAINER_BACKEND:PORTA/`. Verificar o nome do container com `docker network inspect NOME_DA_REDE`.

```yaml
networks:
  traefik_network:
    external: true
services:
  web:
    image: httpd:2.4
    volumes:
      - ../../results:/usr/local/apache2/htdocs/
    ports:
      - "2601:80"
  testes:
    container_name: api-testes-playwright
    build:
      dockerfile: docker/playwright/Dockerfile
      context: ../../
    env_file:
      - .env
    networks:
      - traefik_network
    volumes:
      - ../../results:/opt/tests/results:Z
      - ../../tests/Integration:/opt/tests:Z
      - /opt/tests/node_modules
    environment:
      - CI=true
```

**Regra para o agente:** Antes de criar o `docker-compose.yml` dos testes, SEMPRE inspecionar o `docker-compose.yml` do projeto host para identificar qual estratégia de rede é usada (`network_mode: host` ou rede nomeada) e replicar a mesma abordagem.

### 2.3 .env.example (`docker/playwright/.env.example`)

```env
##### CONFIGURACAO PLAYWRIGHT ###
DB_HOST=
DB_PORT=5432
DB_NAME=meu_banco
DB_USER=
DB_PASS=

API_VERSION=v1
# RESOURCES_URL deve usar o nome do container do backend na rede Docker
# Verificar com: docker network inspect traefik_network
RESOURCES_URL=http://NOME_DO_CONTAINER_BACKEND:PORTA/
###### FIM CONFIGURACAO PLAYWRIGHT ###
```

### 2.4 Script CLI (`docker/playwright/qa`)

```bash
#!/usr/bin/env bash
set -e

ENV_FILE='.env'
ENV_FILE_EXAMPLE='.env.example'

create_dotenv() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Criando arquivo de configuração $ENV_FILE..."
    cp $ENV_FILE_EXAMPLE $ENV_FILE
  fi
}

build() {
  docker compose build
}

start_server_apache() {
  docker compose up -d web
  echo "Relatórios disponíveis em localhost:2601"
}

stop_server_apache() {
  docker compose down -v web
}

setup() {
  create_dotenv
  docker compose build
}

run_tests() {
  docker compose run --rm testes
}

run_tests_headed() {
  docker compose run --rm testes npx playwright test --headed
}

run_tests_debug() {
  docker compose run --rm testes npx playwright test --debug
}

run_specific() {
  docker compose run --rm testes npx playwright test "$@"
}

show_commands() {
  echo
  echo "Comandos disponíveis:"
  echo
  echo "  sh qa build          - (Re)Builda as imagens dos containers"
  echo "  sh qa setup          - Configura o ambiente para execução dos testes"
  echo "  sh qa server-start   - Inicia servidor web para ver relatórios (localhost:2601)"
  echo "  sh qa server-stop    - Para o servidor web"
  echo "  sh qa test           - Executa todos os testes"
  echo "  sh qa test:debug     - Executa testes em modo debug"
  echo "  sh qa test:spec X    - Executa um spec específico"
  echo
}

if [ $# -gt 0 ]; then
  case "$1" in
    "build") build ;;
    "server-start") start_server_apache ;;
    "setup") setup ;;
    "server-stop") stop_server_apache ;;
    "test") run_tests ;;
    "test:debug") run_tests_debug ;;
    "test:spec") shift; run_specific "$@" ;;
    *) show_commands ;;
  esac
else
  show_commands
fi
```

### 2.5 .gitignore (`docker/playwright/.gitignore`)

```
.env
```

---

## 3. CONFIGURAÇÃO DO PLAYWRIGHT

### 3.1 playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../docker/playwright/.env') });

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  retries: 0,
  workers: 1, // Sequencial para evitar conflitos de banco
  reporter: [
    ['html', { outputFolder: './results', open: 'never' }],
    ['list'],
  ],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: process.env.RESOURCES_URL + process.env.API_VERSION + '/',
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    trace: 'on-first-retry',
  },
});
```

### 3.2 package.json

```json
{
  "name": "api-integration-tests",
  "private": true,
  "scripts": {
    "test": "npx playwright test",
    "test:debug": "npx playwright test --debug",
    "report": "npx playwright show-report ./results"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@types/pg": "^8.11.0",
    "@types/bcryptjs": "^2.4.6",
    "pg": "^8.12.0",
    "dotenv": "^16.4.0",
    "bcryptjs": "^2.4.3",
    "typescript": "^5.6.0"
  }
}
```

---

## 4. CAMADA BASE (resources/Base/)

### 4.1 constants.ts — Constantes globais (equivalente às *** Variables *** do API.robot)

```typescript
export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
export const HTTP_NO_CONTENT = 204;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_METHOD_NOT_ALLOWED = 405;
export const HTTP_UNPROCESSABLE_ENTITY = 422;
export const HTTP_INTERNAL_SERVER_ERROR = 500;

export const RESOURCES_URL = process.env.RESOURCES_URL || 'http://localhost:8080/api/';
export const API_URL = process.env.RESOURCES_URL || 'http://localhost:8080/api/';
export const API_VERSION = process.env.API_VERSION || 'v1';
export const BASE_URL = `${RESOURCES_URL}${API_VERSION}/`;

export const CUSTOM_ACCESS_DENIED_MSG = 'Você não tem permissão para acessar este recurso.';
export const MINIMUM_RECORD = 1;
export const CHAR_256 = 'Longo preenchimento textual para validação dos limites de caracteres nos campos do payload e dos formulários de cadastro e edição. Utilizando teste automatizado com Playwright com estratégia de templates em fluxos repetidos. Temos aqui 256 caracteres aqui.';
export const EMAIL_UNAUTHORIZED = 'unauthorized@qa.robot';
```

### 4.2 helpers.ts — Funções utilitárias (equivalente ao Helper.py)

```typescript
export function hasKeyInDictionary(key: string, obj: Record<string, any>): boolean {
  return key in obj;
}

export function containsWord(partial: string, full: string): boolean {
  return full.includes(partial);
}

export function splitSchemaTableName(schemaTableName: string): string[] {
  return schemaTableName.split('.');
}

export function getMaxInteger(): number {
  return Number.MAX_SAFE_INTEGER;
}
```

### 4.3 auth.ts — Autenticação (equivalente ao Get Token / Generate Header do API.robot)

```typescript
import { APIRequestContext } from '@playwright/test';
import { BASE_URL, EMAIL_UNAUTHORIZED } from './constants';

export interface AuthToken {
  token_type: string;
  access_token: string;
}

export async function getTokenAuthenticate(
  request: APIRequestContext,
  user: { email: string; password?: string; senha?: string }
): Promise<{ auth: AuthToken; [key: string]: any }> {
  const response = await request.post(`${BASE_URL}auth/login`, {
    data: { email: user.email, password: user.password || user.senha },
  });
  return response.json();
}

export async function generateHeaderAuthorization(
  request: APIRequestContext,
  user: { email: string; password?: string; senha?: string }
): Promise<Record<string, string>> {
  const token = await getTokenAuthenticate(request, user);
  const tokenType = token.auth.token_type.charAt(0).toUpperCase() + token.auth.token_type.slice(1);
  return { Authorization: `${tokenType} ${token.auth.access_token}` };
}

export async function setHeaders(
  request: APIRequestContext,
  user: { email: string; password?: string; senha?: string }
): Promise<Record<string, string>> {
  if (user.email === EMAIL_UNAUTHORIZED) {
    return { Authorization: '' };
  }
  return generateHeaderAuthorization(request, user);
}
```

### 4.4 api.ts — Cliente HTTP base (equivalente ao API.robot keywords)

```typescript
import { APIRequestContext } from '@playwright/test';
import { BASE_URL, MINIMUM_RECORD } from './constants';
import { db } from '../Database/connection';

export async function executeDatabaseQuery(query: string): Promise<any[] | null> {
  const result = await db.query(query);
  if (result.rows.length >= MINIMUM_RECORD) {
    return result.rows;
  }
  return null;
}

export async function executeDatabaseSqlString(sql: string): Promise<void> {
  await db.query(sql);
}

export function getQueryResultValue(result: any[] | null): any {
  if (result && result.length > 0) {
    return Object.values(result[0])[0];
  }
  return null;
}

export function getQueryResults(results: any[] | null): any[] | null {
  if (results && results.length > 0) {
    return results.map((row) => Object.values(row)[0]);
  }
  return null;
}

export function setCurrentTestExecutionTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 15);
  return now.toISOString();
}
```

---

## 5. CAMADA DATABASE (resources/Database/)

### 5.1 connection.ts — Conexão PostgreSQL

```typescript
import { Pool } from 'pg';

export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'meu_banco',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
});

export async function connectDatabase(): Promise<void> {
  await db.query('SELECT 1');
}

export async function disconnectDatabase(): Promise<void> {
  await db.end();
}
```

### 5.2 database.ts — Constantes de schema + limpeza (equivalente ao Database.robot)

```typescript
import { db } from './connection';

// Schema table constants — adapte para as tabelas do SEU projeto
export const SCHEMA = {
  USER: 'usuario.usuario',
  USER_ROLE: 'usuario.usuario_perfil',
  ROLE: 'usuario.perfil',
  PERSON: 'pessoa.pessoa_fisica',
  COMPANY: 'empresa.empresa',
  // ... adicione todas as tabelas do seu projeto
};

/**
 * Limpa todos os dados de teste criados após o timestamp fornecido.
 * Respeita a ordem de foreign keys (deleta dependentes primeiro).
 */
export async function cleanTestsData(executionTime: string): Promise<void> {
  const queries = [
    // Ordem inversa de dependência — adapte para seu projeto
    `DELETE FROM ${SCHEMA.USER_ROLE} WHERE criacao >= '${executionTime}'`,
    `DELETE FROM ${SCHEMA.USER} WHERE criacao >= '${executionTime}'`,
    `DELETE FROM ${SCHEMA.PERSON} WHERE criacao >= '${executionTime}'`,
    // ... adicione todas as tabelas na ordem correta de FK
  ];

  for (const query of queries) {
    try {
      await db.query(query);
    } catch (error) {
      console.warn(`Aviso ao limpar dados: ${error}`);
    }
  }
}
```

### 5.3 UserDatabase.ts — Exemplo de Database helper por entidade

```typescript
import { db } from './connection';
import { SCHEMA } from './database';
import { executeDatabaseQuery, executeDatabaseSqlString, getQueryResultValue } from '../Base/api';
import bcryptjs from 'bcryptjs';

export async function selectUser(email: string, idPessoaFisica: number): Promise<number | null> {
  const result = await executeDatabaseQuery(
    `SELECT id_usuario FROM ${SCHEMA.USER} WHERE id_pessoa_fisica = ${idPessoaFisica} AND email = '${email}'`
  );
  return getQueryResultValue(result);
}

export async function selectUserByEmail(email: string): Promise<number | null> {
  const result = await executeDatabaseQuery(
    `SELECT id_usuario FROM ${SCHEMA.USER} WHERE email ILIKE '${email}%'`
  );
  return getQueryResultValue(result);
}

export async function insertUser(usuario: any, idPessoaFisica: number): Promise<void> {
  const hashedPass = bcryptjs.hashSync(usuario.senha, 12);
  const ativo = usuario.ativo ?? true;
  await executeDatabaseSqlString(
    `INSERT INTO ${SCHEMA.USER}(id_pessoa_fisica, email, senha, ativo, email_verificado)
     VALUES (${idPessoaFisica}, '${usuario.email}', '${hashedPass}', ${ativo}, True)`
  );
}

export async function createPersonWithUser(data: any): Promise<void> {
  let idPessoaFisica = await selectPF(data.pessoa);
  if (!idPessoaFisica) {
    await insertPerson(data.pessoa);
    idPessoaFisica = await selectPF(data.pessoa);
  }
  let idUsuario = await selectUser(data.usuario.email, idPessoaFisica!);
  if (!idUsuario) {
    await insertUser(data.usuario, idPessoaFisica!);
    idUsuario = await selectUser(data.usuario.email, idPessoaFisica!);
  }
  await insertBindingsForUser(data, idUsuario!);
}

export async function createPersonsAndUsers(dataList: any[]): Promise<void> {
  for (const data of dataList) {
    await createPersonWithUser(data);
  }
}

// selectPF, insertPerson, insertBindingsForUser, deleteUserAndAllBindings...
// Siga o mesmo padrão: query direta no PostgreSQL
```

---

## 6. CAMADA FIXTURES (resources/Fixtures/)

### 6.1 DataFactories — Fábricas de dados estáticos por entidade

Cada Factory retorna dicionários de dados para cenários específicos. Exemplo:

```typescript
// DataFactories/UserFactory.ts
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export function factoryUser(target: string): Record<string, any> {
  const users: Record<string, any> = {
    adm_to_manage_user_suite: {
      email: 'adm@usersuite.com.qa',
      senha: 'Teste123',
      password: 'Teste123',
    },
    c3po_for_patch_active_inative: {
      email: 'c3po@droid.com.qa',
      senha: 'Teste123',
      ativo: false,
    },
    // ... todos os cenários de usuário
  };
  return users[target];
}

// DataFactories/PersonFactory.ts
export function factoryPerson(target: string): Record<string, any> {
  const persons: Record<string, any> = {
    adm_to_manage_user_suite: {
      nome: 'Admin User Suite Qa',
      cpf: '73084626090',
      data_nascimento: '2001-01-01',
      genero: 'Feminino',
    },
    // ... todos os cenários de pessoa
  };
  return persons[target];
}
```

### 6.2 MockDataBuilders — Payloads e rotas para testes parametrizados

```typescript
// MockDataBuilders/UserMockDataBuilder.ts
export function buildUserForMockRequests(target: string): Record<string, any> {
  const data: Record<string, any> = {
    general: {
      id: 0,
      empty: '',
      therm: 'teste',
      invalid_route: '/inexistic/',
      resource_id: '2',
      inexistic_id: '0',
      payloads: {
        user: {
          pessoa: { nome: 'Robot User QA', cpf: '33852395089', data_nascimento: '1990-10-18', genero: 'Masculino' },
          email: 'robot@post.user.br',
          id_perfil: '2',
          id_departamento: '2',
        },
        // ... payloads para edit, etc.
      },
      routes: {
        user_by_id: 'usuario/',
        user: 'usuario',
        // ... todas as rotas
      },
    },
    // ... outros targets (with_users_filters, etc.)
  };
  return data[target];
}
```

### 6.3 SeedBuilders — Composição de seeds por suite de teste

```typescript
// SeedBuilders/UserSuiteSeedBuilder.ts
import { build } from '../DataBuilder';

export function seedUsersForUserSuite(): any[] {
  return [
    build('for_user_suite', 'to_manage_suite'),
    build('for_user_suite', 'for_patch_active_inative'),
    build('for_user_suite', 'for_get_users'),
    build('for_user_suite', 'for_get_users_by_department'),
    build('for_user_suite', 'for_put_user'),
    build('for_user_suite', 'for_get_user_by_id'),
  ];
}
```

### 6.4 DataBuilder.ts — Orquestrador central (equivalente ao DataBuilder.py)

```typescript
import { factoryPerson } from './DataFactories/PersonFactory';
import { factoryUser } from './DataFactories/UserFactory';
// ... imports de todas as factories

export function build(target: string, scenario: string, key?: string): Record<string, any> {
  const data: Record<string, any> = {
    for_user_suite: {
      to_manage_suite: {
        pessoa: factoryPerson('adm_to_manage_user_suite'),
        usuario: factoryUser('adm_to_manage_user_suite'),
        id_perfil: 2,
        id_departamento: 2,
      },
      for_patch_active_inative: {
        pessoa: factoryPerson('c3po_for_patch_active_inative'),
        usuario: factoryUser('c3po_for_patch_active_inative'),
        id_perfil: 2,
        id_departamento: 2,
      },
      // ... todos os cenários
    },
    for_auth_suite: {
      // ... cenários de auth
    },
    // ... todas as suites
  };
  return data[target][scenario];
}
```

---

## 7. CAMADA ROUTES (resources/Routes/)

Cada arquivo encapsula as chamadas HTTP para uma entidade. Equivalente aos arquivos .robot de Routes.

```typescript
// Routes/LoginRoute.ts
import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';

export async function postLogin(request: APIRequestContext, usuario: any) {
  return request.post(`${BASE_URL}auth/login`, {
    data: { email: usuario.email, password: usuario.password || usuario.senha },
  });
}

export async function getLogout(request: APIRequestContext, headers: Record<string, string>) {
  return request.get(`${BASE_URL}auth/logout`, { headers });
}
```

```typescript
// Routes/UserRoute.ts
import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';

export async function getUsuario(request: APIRequestContext, usuario: any, termoPesquisa: string) {
  const headers = await setHeaders(request, usuario);
  return request.get(
    `${BASE_URL}usuario?termoPesquisa=${termoPesquisa}&tamanho=1&pagina=1&colunaOrdenar=email&ordem=desc`,
    { headers }
  );
}

export async function postUsuario(request: APIRequestContext, usuario: any, payload: any) {
  const headers = await setHeaders(request, usuario);
  return request.post(`${BASE_URL}usuario`, { headers, data: payload });
}

export async function putUsuario(request: APIRequestContext, usuario: any, payload: any, idUsuario: number) {
  const headers = await setHeaders(request, usuario);
  return request.put(`${BASE_URL}usuario/${idUsuario}`, { headers, data: payload });
}

export async function patchUsuario(request: APIRequestContext, usuario: any, idUsuario: number) {
  const headers = await setHeaders(request, usuario);
  return request.patch(`${BASE_URL}usuario/${idUsuario}`, { headers });
}
```

---

## 8. CAMADA SEEDS (resources/Seeds/)

Orquestra os SeedBuilders e chama o Database para popular dados antes das suites.

```typescript
// Seeds/UserSeed.ts
import { seedUsersForUserSuite } from '../Fixtures/SeedBuilders/UserSuiteSeedBuilder';
import { createPersonsAndUsers } from '../Database/UserDatabase';

export async function seedingForUserSuite(): Promise<void> {
  const usersData = seedUsersForUserSuite();
  await createPersonsAndUsers(usersData);
}

export async function seedingUsersForAuthSuite(): Promise<void> {
  const usersData = seedUsersForAuthSuite();
  await createPersonsAndUsers(usersData);
}
// ... uma função de seeding para cada suite
```

---

## 9. CAMADA TEMPLATES (resources/Templates/)

Templates reutilizáveis para testes parametrizados (ex: testes de permissão por perfil).

```typescript
// Templates/AttemptRequestsTemplate.ts
import { APIRequestContext, expect } from '@playwright/test';
import { BASE_URL, HTTP_FORBIDDEN, CUSTOM_ACCESS_DENIED_MSG } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { factoryUserAttemptRequests } from '../Fixtures/DataFactories/UserFactory';

export async function attemptRequests(
  request: APIRequestContext,
  params: {
    access: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    route: string;
    field: string;
    statusCode: number;
    mockDataBuilder: (target: string) => any;
    target: string;
  }
) {
  const data = params.mockDataBuilder(params.target);
  const users = factoryUserAttemptRequests();
  const headers = await setHeaders(request, users[params.access]);

  let payload: any = undefined;
  let endpoint = `${BASE_URL}${data.routes[params.route]}`;

  if (params.field === 'payload') {
    payload = data.payloads[params.route];
  } else {
    const parameter = data[params.field];
    endpoint = `${BASE_URL}${data.routes[params.route]}${parameter}`;
  }

  const response = await request[params.method.toLowerCase() as 'get'](endpoint, {
    headers,
    data: payload,
  });

  expect(response.status()).toBe(params.statusCode);
}

/**
 * Template para testar que um perfil sem regra recebe 403 FORBIDDEN.
 */
export async function attemptRequestsForRulesTest(
  request: APIRequestContext,
  params: {
    strategy: string;
    method: string;
    routeAlias: string;
    statusCode?: number;
    payload?: any;
  }
) {
  const statusCode = params.statusCode ?? HTTP_FORBIDDEN;
  // ... lógica de validação de regras de acesso
}
```

---

## 10. CAMADA SPECS (specs/) — Os testes em si

### 10.1 Healthcheck (spec mais simples)

```typescript
// specs/Healthcheck/healthcheck.spec.ts
import { test, expect } from '@playwright/test';
import { API_URL } from '../../resources/Base/constants';

test.describe('Healthcheck', () => {
  test('Status da API', async ({ request }) => {
    const response = await request.get(`${API_URL}status`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
```

### 10.2 Auth/Login (com Suite Setup via seeding)

```typescript
// specs/Auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { seedingUsersForAuthSuite } from '../../resources/Seeds/UserSeed';
import { factoryUser } from '../../resources/Fixtures/DataFactories/UserFactory';
import { postLogin, getLogout } from '../../resources/Routes/LoginRoute';
import { generateHeaderAuthorization } from '../../resources/Base/auth';
import { HTTP_UNAUTHORIZED, HTTP_NO_CONTENT } from '../../resources/Base/constants';

test.describe('Auth Suite', () => {
  test.beforeAll(async () => {
    await seedingUsersForAuthSuite();
  });

  test('Caso 01 - Realizar login', async ({ request }) => {
    const usuario = factoryUser('adm_to_manage_auth_suite');
    const response = await postLogin(request, usuario);
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.auth).toHaveProperty('access_token');
    expect(body).toHaveProperty('email');
    expect(body).toHaveProperty('role');
  });

  test('Caso 02 - Realizar login inválido', async ({ request }) => {
    const usuario = factoryUser('to_invalid_auth_suite');
    const response = await postLogin(request, usuario);
    const body = await response.json();

    expect(response.status()).toBe(HTTP_UNAUTHORIZED);
    expect(body.errors).toBe('E-mail ou senha incorretos.');
  });

  test('Caso 03 - Fazer logout', async ({ request }) => {
    const usuario = factoryUser('adm_to_manage_auth_suite');
    const headers = await generateHeaderAuthorization(request, usuario);
    const response = await getLogout(request, headers);

    expect(response.status()).toBe(HTTP_NO_CONTENT);
  });

  test('Caso 04 - Fazer logout com token inválido', async ({ request }) => {
    const usuario = factoryUser('adm_to_manage_auth_suite');
    const headers = await generateHeaderAuthorization(request, usuario);
    await getLogout(request, headers);
    const response = await getLogout(request, headers);
    const body = await response.json();

    expect(response.status()).toBe(HTTP_UNAUTHORIZED);
    expect(body.error).toBe('Unauthorized');
  });
});
```

### 10.3 Exemplo completo com Setup + Teardown + DB (User Suite)

```typescript
// specs/Usuario/user.spec.ts
import { test, expect } from '@playwright/test';
import { seedingForUserSuite } from '../../resources/Seeds/UserSeed';
import { cleanTestsData } from '../../resources/Database/database';
import { setCurrentTestExecutionTime } from '../../resources/Base/api';
import { factoryUser } from '../../resources/Fixtures/DataFactories/UserFactory';
import { selectUserByEmail } from '../../resources/Database/UserDatabase';
import { HTTP_OK, HTTP_CREATED, HTTP_FORBIDDEN } from '../../resources/Base/constants';
import * as UserRoute from '../../resources/Routes/UserRoute';

let executionTime: string;

test.describe('Users Requests Suite', () => {
  test.beforeAll(async () => {
    await seedingForUserSuite();
    executionTime = setCurrentTestExecutionTime();
  });

  test.afterAll(async () => {
    await cleanTestsData(executionTime);
  });

  test('Caso 01 - Inserir usuario DR', async ({ request }) => {
    const usuario = factoryUser('adm_to_manage_user_suite');
    const payload = factoryUser('for_register_dr_user');
    const response = await UserRoute.postUsuarioDR(request, usuario, payload);
    expect(response.status()).toBe(HTTP_CREATED);
  });

  test('Caso 02 - Listar usuarios DR', async ({ request }) => {
    const usuario = factoryUser('adm_to_manage_user_suite');
    const response = await UserRoute.getUsuarioDR(request, usuario);
    expect(response.status()).toBe(HTTP_OK);
  });

  test('Caso 06 - Saude DR não deve acessar dados de Admin DN', async ({ request }) => {
    const saudeDr = factoryUser('saude_dr');
    const adminDn = factoryUser('admin_dn');
    const idAdminDn = await selectUserByEmail(adminDn.email);

    const response = await UserRoute.getUsuarioDRById(request, saudeDr, idAdminDn!);
    const body = await response.json();

    expect(response.status()).toBe(HTTP_FORBIDDEN);
    expect(body.errors).toBe('Não é possível executar ações para este usuário. Sem acesso ao perfil.');
  });
});
```

---

## 11. LOGS E DEBUG

### 11.1 Configuração de trace e logs no Playwright

O Playwright já gera relatórios HTML ricos automaticamente. A configuração no `playwright.config.ts` já inclui:

- `reporter: [['html', ...], ['list']]` — Gera relatório HTML interativo + output no terminal
- `trace: 'on-first-retry'` — Captura trace completo (requests, responses, timeline) em caso de falha

Para logs adicionais durante os testes, use o padrão:

```typescript
// Em qualquer spec ou resource, use console.log para debug
// O Playwright captura e exibe no relatório

test('Meu teste', async ({ request }) => {
  const response = await request.get(`${BASE_URL}minha-rota`);
  
  // Log para debug — aparece no terminal e no relatório
  console.log('Status:', response.status());
  console.log('Body:', await response.json());
  
  // Log condicional para investigação
  if (response.status() !== 200) {
    console.error('FALHA - Response body:', await response.text());
  }
});
```

### 11.2 Opções de execução para debug

```bash
# Executa com trace completo (gera arquivo .zip com timeline)
npx playwright test --trace on

# Executa com output verboso
npx playwright test --reporter=list

# Executa um teste específico em modo debug (step-by-step)
npx playwright test specs/Auth/login.spec.ts --debug

# Executa e abre o relatório automaticamente
npx playwright test && npx playwright show-report
```

### 11.3 Equivalência Robot → Playwright para logs

| Robot Framework | Playwright (TypeScript) |
|---|---|
| `Log ${variable}` | `console.log('var:', variable)` |
| `-L trace` (ROBOT_OPTIONS) | `trace: 'on'` no config ou `--trace on` |
| `--logtitle MeuProjeto` | `reporter: [['html', { outputFolder: '...' }]]` |
| `--removekeywords name:DatabaseLibrary.connect_to_database` | Não necessário (conexão não aparece no trace) |
| `--outputDir $DIR` | `outputFolder` no reporter config |
| Relatório em `localhost:2600` | `sh qa server-start` → `localhost:2601` |
| `output.xml` | `test-results/` + `playwright-report/` |

### 11.4 global-setup.ts e global-teardown.ts

```typescript
// global-setup.ts
import { connectDatabase } from './resources/Database/connection';

async function globalSetup() {
  console.log('[SETUP] Conectando ao banco de dados...');
  await connectDatabase();
  console.log('[SETUP] Banco conectado com sucesso.');
}

export default globalSetup;
```

```typescript
// global-teardown.ts
import { disconnectDatabase } from './resources/Database/connection';

async function globalTeardown() {
  console.log('[TEARDOWN] Desconectando do banco de dados...');
  await disconnectDatabase();
  console.log('[TEARDOWN] Banco desconectado.');
}

export default globalTeardown;
```

---

## 11.5 ISOLAMENTO DO TYPESCRIPT (OBRIGATÓRIO)

A pasta `tests/Integration/` contém imports de `@playwright/test` que NÃO existem no projeto principal. Se o `tsconfig.json` ou `tsconfig.build.json` do projeto host não excluir essa pasta, o compilador TypeScript vai falhar e pode derrubar o backend em desenvolvimento.

**Após criar a estrutura, SEMPRE verificar e ajustar os arquivos do projeto host:**

Em `tsconfig.build.json` do projeto host, adicionar `"tests"` no exclude:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "tests", "dist", "**/*spec.ts"]
}
```

Em `tsconfig.json` do projeto host, adicionar `"tests/Integration"` no exclude:
```json
{
  "exclude": ["node_modules", "dist", "tests/Integration"]
}
```

### 11.6 tsconfig.json dos testes (`tests/Integration/tsconfig.json`)

Criar um `tsconfig.json` isolado para os testes Playwright:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 12. RESUMO DA EQUIVALÊNCIA ARQUITETURAL

| Camada (Robot Framework) | Camada (Playwright/TypeScript) | Responsabilidade |
|---|---|---|
| `resources/Base/API.robot` | `resources/Base/api.ts` + `auth.ts` + `constants.ts` | Cliente HTTP, auth, constantes |
| `resources/Base/Helper.py` | `resources/Base/helpers.ts` | Funções utilitárias |
| `resources/Base/Requirements.robot` | `package.json` + imports nos arquivos | Dependências e imports |
| `resources/Database/Database.robot` | `resources/Database/database.ts` | Schema constants + cleanup |
| `resources/Database/[X]Database.robot` | `resources/Database/[X]Database.ts` | CRUD direto no banco por entidade |
| `resources/Fixtures/DataBuilder.py` | `resources/Fixtures/DataBuilder.ts` | Orquestrador central de massa |
| `resources/Fixtures/DataFactories/*.py` | `resources/Fixtures/DataFactories/*.ts` | Fábricas de dados estáticos |
| `resources/Fixtures/MockDataBuilders/*.py` | `resources/Fixtures/MockDataBuilders/*.ts` | Payloads + rotas para testes |
| `resources/Fixtures/SeedBuilders/*.py` | `resources/Fixtures/SeedBuilders/*.ts` | Composição de seeds por suite |
| `resources/Routes/*.robot` | `resources/Routes/*.ts` | Encapsulamento de chamadas HTTP |
| `resources/Seeds/*.robot` | `resources/Seeds/*.ts` | Orquestração de seeding |
| `resources/Templates/*.robot` | `resources/Templates/*.ts` | Templates reutilizáveis |
| `specs/**/*.robot` | `specs/**/*.spec.ts` | Testes em si |
| `docker/robot/` | `docker/playwright/` | Docker para execução isolada |
| `docker/robot/qa` | `docker/playwright/qa` | CLI de comandos |
| `docker/robot/bin/run-tests-in-virtual-screen.sh` | `docker/playwright/bin/run-tests.sh` | Script de execução |
| `results/` (Apache :2600) | `results/` (Apache :2601) | Relatórios HTML |

---

## 13. INSTRUÇÕES PARA O AGENTE

1. Crie TODA a estrutura de pastas conforme a seção 1.
2. Comece pelo Docker (seção 2) e configuração do Playwright (seção 3).
3. Implemente a camada Base (seção 4) — é a fundação de tudo.
4. Implemente a camada Database (seção 5) — conexão e helpers de banco.
5. Implemente as Fixtures (seção 6) — adapte as factories para as entidades do SEU projeto.
6. Implemente as Routes (seção 7) — uma por entidade/módulo da API.
7. Implemente os Seeds (seção 8) — orquestram a criação de massa.
8. Implemente os Templates (seção 9) — para testes parametrizados de permissão.
9. Crie os specs (seção 10) — comece pelo Healthcheck, depois Auth, depois as entidades.
10. Configure logs e debug (seção 11).
11. Adapte os nomes de tabelas, schemas, rotas e payloads para o contexto do novo projeto.
12. Mantenha o padrão de nomenclatura: `factoryXxx`, `seedXxx`, `buildXxx`, `selectXxx`, `insertXxx`, `deleteXxx`.
13. Cada spec deve ter `beforeAll` para seeding e `afterAll` para cleanup.
14. Use `test.describe` para agrupar por suite (equivalente ao arquivo .robot).
15. Use `test.describe.configure({ mode: 'serial' })` quando os testes dependem de ordem.
16. NUNCA rodar `npm install` fora do Docker — dependências são instaladas apenas no `docker build`.
17. Após criar a estrutura, SEMPRE verificar e ajustar `tsconfig.build.json` e `tsconfig.json` do projeto host para excluir `tests/` (seção 11.5).
18. O `outputFolder` do reporter HTML DEVE usar caminho relativo ao WORKDIR do container (`./results`), NUNCA `../../results`.
19. O `.env` do Docker DEVE usar nomes de containers da rede Docker como hosts (verificar com `docker network inspect`), NUNCA `localhost`.
20. Criar `tsconfig.json` isolado dentro de `tests/Integration/` (seção 11.6).
21. Após criar TODA a estrutura, SEMPRE gerar o `README.md` dentro de `tests/Integration/` seguindo o template da seção 17. O README deve ser adaptado ao projeto real, não genérico.


---

## 14. CENTRALIZADOR DE IMPORTS (equivalente ao Requirements.robot)

No projeto de referência, o arquivo `Requirements.robot` centraliza TODOS os imports do projeto. Qualquer spec que faz `Resource ../Base/API.robot` automaticamente herda tudo: libraries, factories, mock builders, seed builders, databases, routes, seeds e templates.

Para replicar esse padrão em TypeScript, crie um **barrel file** centralizador:

### 14.1 resources/index.ts — O "Requirements.robot" do Playwright

O `index.ts` DEVE exportar `test` e `expect` do Playwright junto com todos os recursos do projeto. Isso permite que os specs usem um padrão de import padronizado e consistente.

```typescript
// ============================================================
// CENTRALIZADOR DE IMPORTS — equivalente ao Requirements.robot
// ============================================================

// ---- Playwright ----
export { test, expect } from '@playwright/test';

// ---- Base ----
export * from './Base/constants';
export * from './Base/helpers';
export * from './Base/auth';
export * from './Base/api';

// ---- Database ----
export * from './Database/connection';
export * from './Database/database';
export * as UserDB from './Database/UserDatabase';
export * as CompanyDB from './Database/CompanyDatabase';
// ... adicione todos os [Entidade]Database.ts como namespace

// ---- DataFactories ----
export { factoryUser, factoryUserAttemptRequests } from './Fixtures/DataFactories/UserFactory';
export { factoryPerson } from './Fixtures/DataFactories/PersonFactory';
// ... adicione todas as factories

// ---- MockDataBuilders ----
export { buildUserForMockRequests } from './Fixtures/MockDataBuilders/UserMockDataBuilder';
// ... adicione todos os mock builders

// ---- SeedBuilders ----
export { seedUsersForUserSuite } from './Fixtures/SeedBuilders/UserSuiteSeedBuilder';
export { seedUsersForAuthSuite } from './Fixtures/SeedBuilders/AuthSuiteSeedBuilder';
// ... adicione todos os seed builders

// ---- DataBuilder (orquestrador central) ----
export { build } from './Fixtures/DataBuilder';

// ---- Routes ----
export * as LoginRoute from './Routes/LoginRoute';
export * as UserRoute from './Routes/UserRoute';
export * as CompanyRoute from './Routes/CompanyRoute';
// ... adicione todas as routes

// ---- Seeds ----
export * from './Seeds/UserSeed';
export * from './Seeds/CompanySeed';
// ... adicione todos os seeds

// ---- Templates ----
export * from './Templates/AttemptRequestsTemplate';
```

### 14.2 Padrão de import nos specs (OBRIGATÓRIO)

Todo spec DEVE usar exatamente estas duas linhas de import — sem exceção:

```typescript
import { test, expect } from '../../resources';
import * as API from '../../resources';
```

- `test` e `expect` são extraídos diretamente (usados em toda linha, não faz sentido prefixar)
- `API` é o namespace para todo o resto: factories, routes, seeds, constantes, database helpers

Equivalência com Robot Framework:
```
*** Settings ***
Resource    ../../resources/Base/API.robot
```

Exemplo de uso no spec:
```typescript
import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('User Suite', () => {
  test('Caso 01 - Listar usuários', async ({ request }) => {
    const usuario = API.factoryUser('adm_to_manage_suite');
    const response = await API.UserRoute.getUsers(request, usuario);

    expect(response.status()).toBe(API.HTTP_OK);
  });
});
```

### 14.3 Regra importante

Toda vez que criar um novo arquivo em qualquer camada (Database, Factory, Route, Seed, etc.), **adicione o export correspondente no `resources/index.ts`**. Isso mantém o centralizador sempre atualizado, exatamente como o `Requirements.robot` faz com cada novo `Resource` ou `Library`.

### 14.4 Para evitar conflitos de nomes

Database helpers de entidades diferentes DEVEM usar namespace exports no `index.ts`:

```typescript
// No index.ts
export * as UserDB from './Database/UserDatabase';
export * as CompanyDB from './Database/CompanyDatabase';

// No spec — acesso via API.UserDB, API.CompanyDB
const userId = await API.UserDB.selectById(1);
const companyId = await API.CompanyDB.selectById(1);
```
const companyId = await CompanyDB.selectById(1);
```


---

## 15. PADRÕES IMPORTANTES QUE FALTAM

### 15.1 RouteFactory — Catálogo centralizado de todas as rotas da API

No projeto de referência existe um `RouteFactory.py` que mapeia TODAS as rotas da API com constantes. Isso é usado nos testes de permissão (AttemptRequests) e nos testes de regras de acesso. Crie o equivalente:

```typescript
// Fixtures/DataFactories/RouteFactory.ts

const ID_CONST = '0';
const UF_CONST = 'SC';
const CEP_CONST = '88701105';
const CPF_CONST = '21973119056';

export function factoryRoute(target: string): string {
  const routes: Record<string, string> = {
    ROOT_ROUTE: '',
    HEALTHCHECK_ROUTE: 'status',
    // Auth
    AUTH_LOGIN_ROUTE: 'auth/login',
    AUTH_LOGOUT_ROUTE: 'auth/logout',
    // Usuário
    USER_DEFAULT_ROUTE: 'usuario',
    USER_BY_ID_ROUTE: `usuario/${ID_CONST}`,
    USER_DEPARTMENT_ROUTE: `usuario/departamento/${ID_CONST}`,
    USER_PROFILE_ROUTE: 'usuario/perfil',
    // Empresa
    COMPANY_DEFAULT_ROUTE: 'empresa',
    COMPANY_BY_ID_ROUTE: `empresa/${ID_CONST}`,
    // ... TODAS as rotas da sua API aqui
  };
  return routes[target];
}

/** Rotas públicas que não exigem autenticação */
export function buildPublicRoutesMockRequests(): Record<string, string> {
  return {
    HELP_EMAIL_ROUTE: 'ajuda/email',
    STATE_DEFAULT_ROUTE: 'estado',
    // ... rotas públicas
  };
}
```

### 15.2 Testes Data-Driven / Parametrizados (equivalente ao Test Template do Robot)

No Robot Framework, o `Test Template` permite definir um template de keyword e cada test case passa argumentos diferentes. Exemplo real do projeto:

```robot
Test Template        Attempt Requests

*Test Cases*
Attempt 01 - admin_dn deve receber HTTP_OK
    admin_dn    GET    filters_complete    no_parameter    ${HTTP_OK}

Attempt 04 - mercado_dr deve receber HTTP_FORBIDDEN
    mercado_dr  GET    filters_complete    no_parameter    ${HTTP_FORBIDDEN}
```

No Playwright, use um **array de cenários + loop** para replicar esse padrão:

```typescript
// specs/Usuario/AttemptRequests/AttemptsGetUserAdministrativo.spec.ts
import { test, expect } from '@playwright/test';
import {
  attemptRequests,
  buildUserForMockRequests,
  HTTP_OK, HTTP_FORBIDDEN,
} from '../../../resources';
import { seedUsersForAttemptRequests } from '../../../resources/Seeds/UserSeed';

const MOCK_DATA_BUILDER = buildUserForMockRequests;
const TARGET = 'with_users_adminitrativo_filters';

// Definição data-driven: [perfil, método, rota, campo, statusEsperado]
const scenarios = [
  ['admin_dn',         'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['admin_dr',         'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['saude_regiao',     'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['mercado_dr',       'GET', 'filters_complete', 'no_parameter', HTTP_FORBIDDEN],
  ['admin_unidade',    'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['vacinador_padrao', 'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['admin_empresa',    'GET', 'filters_complete', 'no_parameter', HTTP_FORBIDDEN],
  ['vacinador_admin',  'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['saude_dn',         'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['saude_dr',         'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['saude_uo',         'GET', 'filters_complete', 'no_parameter', HTTP_OK],
  ['suporte',          'GET', 'filters_complete', 'no_parameter', HTTP_FORBIDDEN],
  ['master',           'GET', 'filters_complete', 'no_parameter', HTTP_OK],
] as const;

test.describe('Attempt GET Usuários Administrativos', () => {
  test.beforeAll(async () => {
    await seedUsersForAttemptRequests();
  });

  for (const [index, [access, method, route, field, statusCode]] of scenarios.entries()) {
    test(`Attempt ${String(index + 1).padStart(2, '0')} - ${access} deve receber ${statusCode}`, async ({ request }) => {
      await attemptRequests(request, {
        access,
        method: method as any,
        route,
        field,
        statusCode,
        mockDataBuilder: MOCK_DATA_BUILDER,
        target: TARGET,
      });
    });
  }
});
```

### 15.3 Documentação BDD dos cenários de teste (equivalente ao .feature)

O projeto de referência tem um arquivo `AttemptRequests.feature` em Gherkin que documenta os padrões de resposta esperados. Crie o equivalente como documentação:

```typescript
// resources/Docs/AttemptRequests.ts
/**
 * PADRÕES DE RESPOSTA PARA REQUISIÇÕES À API
 *
 * Cenário 01 - HTTP_UNAUTHORIZED:
 *   Dado usuário sem autorização
 *   Quando realiza requisição para rota existente com dados válidos
 *   Então deve responder HTTP_UNAUTHORIZED (401)
 *
 * Cenário 03 - HTTP_NOT_FOUND:
 *   Dado usuário autorizado
 *   Quando passa parâmetro de recurso inexistente
 *   Então deve responder HTTP_NOT_FOUND (404)
 *
 * Cenário 09 - HTTP_METHOD_NOT_ALLOWED:
 *   Dado qualquer usuário
 *   Quando usa método HTTP não implementado em rota válida
 *   Então deve responder HTTP_METHOD_NOT_ALLOWED (405)
 *
 * Cenário 11 - HTTP_UNPROCESSABLE_ENTITY:
 *   Dado usuário autorizado
 *   Quando envia payload faltando campos obrigatórios
 *   Então deve responder HTTP_UNPROCESSABLE_ENTITY (422)
 *
 * Cenário 12 - Validações tratadas:
 *   Dado usuário autorizado
 *   Quando envia payload com tipos de dados incorretos
 *   Então deve responder com mensagens de erro tratadas por campo
 */
```

### 15.4 Testes de Regras de Acesso (Rules Access Denied / Authorized)

O projeto de referência tem um padrão sofisticado para testar se cada regra de perfil funciona corretamente. Adapte:

```typescript
// specs/Regra/RulesAccessDenied.spec.ts
import { test, expect } from '@playwright/test';
import {
  attemptRequestsForRulesTest,
  factoryRoute,
  HTTP_FORBIDDEN,
} from '../../resources';

const rulesScenarios = [
  { strategy: 'rules_access_danied', method: 'GET',  routeAlias: 'USER_DEFAULT_ROUTE' },
  { strategy: 'rules_access_danied', method: 'POST', routeAlias: 'USER_DEFAULT_ROUTE' },
  { strategy: 'rules_access_danied', method: 'GET',  routeAlias: 'COMPANY_DEFAULT_ROUTE' },
  // ... todas as combinações regra × rota
];

test.describe('Rules Access Denied', () => {
  for (const scenario of rulesScenarios) {
    test(`${scenario.method} ${scenario.routeAlias} deve ser FORBIDDEN`, async ({ request }) => {
      await attemptRequestsForRulesTest(request, {
        ...scenario,
        statusCode: HTTP_FORBIDDEN,
      });
    });
  }
});
```

### 15.5 Validação de mensagens de erro por campo (Template de payload inválido)

O projeto de referência tem o template `Attempt Requests With Invalid Values In Fields Of The Payload` que testa cada campo com valores inválidos e valida a mensagem de erro retornada. Adapte:

```typescript
// Templates/InvalidPayloadTemplate.ts
import { APIRequestContext, expect } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { factoryUserAttemptRequests } from '../Fixtures/DataFactories/UserFactory';

export async function attemptWithInvalidField(
  request: APIRequestContext,
  params: {
    access: string;
    method: 'POST' | 'PUT' | 'PATCH';
    route: string;
    key: string;           // campo do payload a invalidar
    inputField: any;       // valor inválido a colocar
    statusCode: number;
    expectedMessage: string;
    arrayKey?: string;
    mockDataBuilder: (target: string) => any;
    target: string;
  }
) {
  const data = params.mockDataBuilder(params.target);
  const users = factoryUserAttemptRequests();
  const headers = await setHeaders(request, users[params.access]);

  const payload = { ...data.payloads[params.route] };
  payload[params.key] = params.inputField;

  const endpoint = `${BASE_URL}${data.routes[params.route]}`;

  const response = await request[params.method.toLowerCase() as 'post'](endpoint, {
    headers,
    data: payload,
  });

  expect(response.status()).toBe(params.statusCode);

  const body = await response.json();
  const errors = body.errors || body;
  const errorKey = params.arrayKey ? `${params.key}.${params.arrayKey}` : params.key;

  // Busca a mensagem de erro no campo correspondente
  const fieldErrors = errors[errorKey] || errors[`${params.key}.0`] || errors[`${errorKey}.0`];
  const errorsAsString = JSON.stringify(fieldErrors || errors);
  expect(errorsAsString).toContain(params.expectedMessage);
}
```

### 15.6 Padrão de avaliação de resposta (Evaluate Response Behavior)

O projeto de referência tem keywords que avaliam o comportamento da resposta de forma inteligente (ex: se retornou 500 é bug crítico, se retornou 200 sem permissão é falha de segurança). Adapte:

```typescript
// Templates/ResponseEvaluator.ts
import { expect } from '@playwright/test';
import {
  HTTP_OK, HTTP_FORBIDDEN, HTTP_NOT_FOUND,
  HTTP_UNPROCESSABLE_ENTITY, HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED, HTTP_METHOD_NOT_ALLOWED,
  CUSTOM_ACCESS_DENIED_MSG,
} from '../Base/constants';

export function evaluateResponseBehavior(
  status: number,
  body: any,
  isPublicRoute: boolean
): void {
  if (status === HTTP_INTERNAL_SERVER_ERROR) {
    throw new Error(`QA: ${status} - ALTA PRIORIDADE! Avaliar incidente.`);
  }
  if (status === HTTP_OK && !isPublicRoute) {
    throw new Error(`QA: ${status} - Avaliar se este usuário deveria ter acesso sem regras de perfil.`);
  }
  if (status === HTTP_UNPROCESSABLE_ENTITY && !isPublicRoute) {
    throw new Error(`QA: ${status} - Deveria validar acesso ANTES de validar dados.`);
  }
  if (status === HTTP_FORBIDDEN) {
    expect(body.errors).toBe(CUSTOM_ACCESS_DENIED_MSG);
  }
}

export function evaluateResponseForRulesAuthorized(status: number): void {
  if (status === HTTP_INTERNAL_SERVER_ERROR) {
    throw new Error(`QA: ${status} - ALTA PRIORIDADE! Avaliar incidente.`);
  }
  if (status === HTTP_FORBIDDEN || status === HTTP_UNAUTHORIZED) {
    throw new Error(`QA: ${status} - Usuário deveria ter acesso.`);
  }
  if (status === HTTP_METHOD_NOT_ALLOWED) {
    throw new Error(`QA: ${status} - Avaliar comportamento desta rota.`);
  }
  // Se chegou aqui, o acesso foi autorizado corretamente
}
```

---

## 16. CHECKLIST FINAL

Antes de considerar a estrutura completa, verifique se criou:

- [ ] `docker/playwright/` — Dockerfile, docker-compose.yml, .env.example, qa, .gitignore
- [ ] `tests/Integration/playwright.config.ts` e `package.json`
- [ ] `tests/Integration/tsconfig.json` — TypeScript isolado dos testes
- [ ] `tests/Integration/global-setup.ts` e `global-teardown.ts`
- [ ] `resources/index.ts` — Centralizador de imports (barrel file)
- [ ] `resources/Base/` — constants.ts, helpers.ts, auth.ts, api.ts
- [ ] `resources/Database/` — connection.ts, database.ts, [Entidade]Database.ts
- [ ] `resources/Fixtures/DataBuilder.ts` — Orquestrador central
- [ ] `resources/Fixtures/DataFactories/` — Uma factory por entidade + RouteFactory.ts
- [ ] `resources/Fixtures/MockDataBuilders/` — Um builder por entidade
- [ ] `resources/Fixtures/SeedBuilders/` — Um seed builder por suite
- [ ] `resources/Routes/` — Um arquivo por entidade/módulo
- [ ] `resources/Seeds/` — Um arquivo por entidade
- [ ] `resources/Templates/` — AttemptRequestsTemplate.ts, InvalidPayloadTemplate.ts, ResponseEvaluator.ts
- [ ] `resources/Docs/` — Documentação dos padrões de cenários
- [ ] `specs/Healthcheck/` — Spec mais simples para validar que tudo funciona
- [ ] `specs/Auth/` — Login, logout
- [ ] `specs/[Modulo]/` — Specs de CRUD por entidade
- [ ] `specs/[Modulo]/AttemptRequests/` — Testes data-driven de permissão por perfil
- [ ] `specs/Regra/` — Testes de regras de acesso (denied + authorized)
- [ ] `results/` — Diretório para relatórios HTML
- [ ] `tsconfig.build.json` do projeto host — Excluir `"tests"` no exclude
- [ ] `tsconfig.json` do projeto host — Excluir `"tests/Integration"` no exclude
- [ ] `.env` do Docker — Hosts apontando para nomes de containers na rede Docker (NUNCA localhost)
- [ ] `tests/Integration/README.md` — Documentação completa da estrutura de testes

---

## 17. README DOS TESTES (`tests/Integration/README.md`)

Após criar toda a estrutura, **SEMPRE** gerar um `README.md` dentro de `tests/Integration/` documentando a estrutura criada. O README deve ser adaptado ao projeto real (nomes de entidades, rotas, módulos) e conter as seguintes seções:

### 17.1 Estrutura do README

```markdown
# Testes de Integração — [Nome do Projeto]

Testes de integração de API usando **Playwright (TypeScript)** com acesso direto ao banco PostgreSQL para seeding e cleanup.

---

## Arquitetura

[Árvore de diretórios completa da estrutura criada, com comentários explicando cada camada]

---

## Pré-requisitos

- Docker e Docker Compose instalados
- Backend rodando (comando para iniciar o backend)
- Banco PostgreSQL acessível

---

## Setup

### Via Docker (recomendado para CI)

[Comandos para setup inicial: sh qa setup, editar .env]

### Variáveis de ambiente

[Tabela ou bloco com todas as variáveis do .env.example e o que cada uma faz]

> **Importante:** Se rodar via Docker com rede interna, usar nome do container em vez de localhost.

---

## Executando os testes

### Via script CLI (Docker)

[Todos os comandos do script qa: test, test:spec, test:debug, build, server-start, server-stop]

### Direto (dev local)

[Comandos para rodar sem Docker, se aplicável]

> **Nunca** instale as dependências do Playwright no projeto host.

---

## Relatórios

[Como acessar relatórios HTML: via Apache (localhost:2601) ou via npx playwright show-report]

---

## Padrão de imports nos specs

[Explicar o padrão obrigatório de duas linhas de import com exemplo]

---

## Fluxo de cada spec

[Diagrama textual: beforeAll → seeding → testes → afterAll → cleanup]

---

## Como adicionar novos testes

### 1. Nova entidade

[Lista de arquivos a criar para cada nova entidade: Database, Factory, MockDataBuilder, SeedBuilder, Route, Seed, Spec]

### 2. Atualizar o barrel file

[Lembrete de sempre adicionar exports no resources/index.ts]

### 3. Adicionar tabela no cleanup

[Lembrete de adicionar no SCHEMA e no cleanTestsData respeitando FK]

---

## Convenções

[Tabela com padrões de nomenclatura: factory, seed, route, database, build, cleanup]

---

## Equivalência de camadas

[Tabela resumida: camada → responsabilidade]

---

## Debug

[Comandos para trace, reporter verboso, debug de spec específico, console.log]

---

## Isolamento do TypeScript

[Explicar que tests/Integration tem tsconfig próprio e que o host exclui essa pasta]
```

### 17.2 Regras para o README

1. **Adaptar ao projeto real** — usar nomes de entidades, rotas e módulos do projeto, não os genéricos do prompt.
2. **Incluir TODOS os comandos** — setup, execução, debug, relatórios.
3. **Documentar variáveis de ambiente** — cada variável do `.env.example` com descrição.
4. **Incluir árvore de diretórios** — com comentários explicando o papel de cada pasta/arquivo.
5. **Incluir exemplos de código** — padrão de import, exemplo de spec, exemplo de factory.
6. **Documentar como adicionar novos testes** — passo a passo para nova entidade.
7. **Documentar convenções de nomenclatura** — tabela com padrões (factory, seed, route, etc.).
8. **Incluir seção de debug** — comandos para trace, reporter, debug step-by-step.
9. **Explicar isolamento do TypeScript** — por que existe tsconfig separado e o que foi excluído no host.
10. **Manter em português brasileiro** — consistente com o idioma do projeto.

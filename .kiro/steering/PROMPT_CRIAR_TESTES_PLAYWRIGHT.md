# PROMPT: Criar Estrutura de Testes de API com Playwright (TypeScript)

## Contexto

Crie uma estrutura completa de testes de integração de API usando **Playwright (TypeScript)** em um projeto backend. A estrutura segue padrões arquiteturais de projetos Robot Framework, adaptados para Playwright + TypeScript, com **Allure Report** para relatórios ricos.

A estrutura é organizada em camadas: Base, Database, Routes, Fixtures (DataFactories, MockDataBuilders, SeedBuilders), Seeds, Templates e Specs.

---

## 1. ESTRUTURA DE PASTAS

```
docker/playwright/
├── .env.example
├── .gitignore
├── .run-counter                # Contador de execuções (gerado automaticamente, gitignored)
├── docker-compose.yml
├── Dockerfile
└── qa                          # Script CLI para build/run/relatórios

tests/Integration/
├── tsconfig.json               # TypeScript isolado dos testes
├── playwright.config.ts
├── package.json
├── global-setup.ts
├── global-teardown.ts
├── clean-reporter.js           # Reporter customizado (terminal limpo)
├── allure-suite-fixer.js       # Pós-processador de labels Allure (suites + behaviors)
├── resources/
│   ├── index.ts                # 🔑 Barrel file — centraliza TODOS os exports
│   ├── Base/
│   │   ├── test-base.ts        # Test customizado (re-export de @playwright/test)
│   │   ├── constants.ts        # HTTP status codes, URLs, mensagens
│   │   ├── helpers.ts          # Funções utilitárias
│   │   ├── auth.ts             # Autenticação e geração de headers
│   │   ├── api.ts              # Queries no banco, helpers de resultado
│   │   └── request-logger.ts   # Anexa request/response ao Allure
│   ├── Database/
│   │   ├── connection.ts       # Pool PostgreSQL (pg) com suporte SSL
│   │   ├── database.ts         # Schema constants + cleanTestsData()
│   │   └── [Entidade]Database.ts
│   ├── Routes/
│   │   └── [Entidade]Route.ts  # Cada rota loga request/response no Allure
│   ├── Fixtures/
│   │   ├── DataBuilder.ts      # Orquestrador central de massa de dados
│   │   ├── DataFactories/
│   │   │   ├── [Entidade]Factory.ts
│   │   │   └── RouteFactory.ts # Catálogo centralizado de rotas da API
│   │   ├── MockDataBuilders/
│   │   │   └── [Entidade]MockDataBuilder.ts  # Payloads e rotas por endpoint
│   │   └── SeedBuilders/
│   │       ├── [Modulo]SuiteSeedBuilder.ts   # Seeds + ATTEMPT_USUARIOS + seedAttempt
│   │       └── [Modulo]AttemptSetup.ts       # Setup compartilhado (quando necessário)
│   ├── Seeds/
│   │   └── [Entidade]Seed.ts
│   ├── Templates/
│   │   ├── PermissionTemplate.ts       # describeAttemptSuite (controle de acesso)
│   │   ├── InvalidFieldsTemplate.ts    # describeInvalidFieldSuite (validação de payload)
│   │   ├── SecurityTemplate.ts         # describeSecuritySuite (SQL Injection, XSS, Mass Assignment, Concorrência, Stacktrace)
│   │   └── ResponseEvaluator.ts        # Avaliação inteligente de resposta
│   └── Docs/
│       └── AttemptRequests.ts
└── specs/
    ├── Healthcheck/
    │   └── healthcheck.spec.ts
    ├── Auth/
    │   ├── login.spec.ts
    │   └── AttemptRequests/
    │       ├── PostLogin.spec.ts       # 1 arquivo = 1 endpoint
    │       ├── PostLogout.spec.ts
    │       └── PostRefresh.spec.ts
    ├── [Modulo]/
    │   ├── [entidade].spec.ts
    │   ├── AttemptRequests/
    │   │   ├── Get[Entidade].spec.ts
    │   │   ├── Post[Entidade].spec.ts
    │   │   ├── Post[Entidade]InvalidFields.spec.ts
    │   │   ├── Patch[Entidade].spec.ts
    │   │   └── Delete[Entidade].spec.ts
    │   └── Security/
    │       ├── Post[Entidade]Security.spec.ts
    │       └── Patch[Entidade]Security.spec.ts
    └── ...

results/                        # Relatórios (bind mount do Docker, gitignored)
├── .history/                   # Histórico persistente para gráfico de tendência
├── allure-results/             # JSONs intermediários
├── allure-report/              # Relatório Allure HTML
└── html/                       # Relatório Playwright HTML
```

---

## 2. DOCKER

### 2.1 Dockerfile (`docker/playwright/Dockerfile`)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

ENV TZ=America/Sao_Paulo
ENV LANG=pt_BR.UTF-8

WORKDIR /opt/tests

RUN apt-get update && apt-get install -y \
    postgresql-client \
    locales \
    default-jre-headless \
    && sed -i -e 's/# pt_BR.UTF-8 UTF-8/pt_BR.UTF-8 UTF-8/' /etc/locale.gen \
    && dpkg-reconfigure --frontend=noninteractive locales \
    && update-locale LANG=pt_BR.UTF-8 \
    && rm -rf /var/lib/apt/lists/*

COPY tests/Integration/package.json ./
RUN npm install

COPY tests/Integration/ ./

RUN mkdir -p /opt/tests/results/allure-results \
             /opt/tests/results/allure-report \
             /opt/tests/results/html \
             /opt/tests/test-results \
    && chmod -R 777 /opt/tests/results /opt/tests/test-results

CMD ["npx", "playwright", "test"]
```

### 2.2 docker-compose.yml

**IMPORTANTE:** A configuração de rede DEVE espelhar a do backend do projeto host.

**Opção A — Backend usa `network_mode: host`:**

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
      - ../../tests/Integration/specs:/opt/tests/specs:ro
      - ../../tests/Integration/resources:/opt/tests/resources:ro
      - ../../tests/Integration/playwright.config.ts:/opt/tests/playwright.config.ts:ro
      - ../../tests/Integration/global-setup.ts:/opt/tests/global-setup.ts:ro
      - ../../tests/Integration/global-teardown.ts:/opt/tests/global-teardown.ts:ro
      - ../../tests/Integration/clean-reporter.js:/opt/tests/clean-reporter.js:ro
      - ../../tests/Integration/allure-suite-fixer.js:/opt/tests/allure-suite-fixer.js:ro
      - ../../results:/opt/tests/results
    environment:
      - CI=true
```

**Opção B — Backend usa rede Docker nomeada:**

```yaml
networks:
  minha_rede:
    external: true
services:
  testes:
    # ... mesmo que acima, mas com:
    networks:
      - minha_rede
    # Em vez de network_mode: host
```

**Regra:** Inspecionar o `docker-compose.yml` do projeto host para identificar a estratégia de rede.

### 2.3 .env.example

```env
##### CONFIGURACAO PLAYWRIGHT ###
DB_HOST=
DB_PORT=5432
DB_NAME=postgres
DB_USER=
DB_PASS=
DB_SSL=false

# URL da API (usar nome do container se rede Docker, localhost se host mode)
RESOURCES_URL=http://localhost:3000/
###### FIM CONFIGURACAO PLAYWRIGHT ###
```

### 2.4 Script CLI (`docker/playwright/qa`)

O script inclui:
- **Histórico de tendência** — preserva `results/.history/` entre execuções para o gráfico de tendência do Allure
- **Contador de execuções** — `docker/playwright/.run-counter` incrementa a cada run
- **executor.json** — gerado dentro do container com `buildOrder` e `buildName` para labels no gráfico

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

build() { docker compose build; }

start_server_apache() {
  docker compose up -d web
  echo "Relatórios disponíveis em localhost:2601"
}

stop_server_apache() { docker compose down -v web; }

setup() {
  create_dotenv
  docker compose build
}

generate_executor() {
  local counter_file=".run-counter"
  local count=1

  if [ -f "$counter_file" ]; then
    count=$(( $(cat "$counter_file") + 1 ))
  fi

  echo "$count" > "$counter_file"
  echo "${count}"
}

run_tests() {
  local count=$(generate_executor)
  local build_name="Run #${count}"
  local build_date=$(date '+%d/%m/%Y %H:%M')
  docker compose run --rm testes sh -c \
    "mkdir -p ./results/allure-results ./results/.history; \
     cp -r ./results/.history/. ./results/allure-results/history 2>/dev/null || true; \
     rm -f ./results/allure-results/*-result.json ./results/allure-results/*-attachment.* ./results/allure-results/executor.json ./results/allure-results/environment.properties; \
     npx playwright test; \
     node allure-suite-fixer.js; \
     printf '{\"name\":\"QA Local\",\"type\":\"local\",\"buildOrder\":${count},\"buildName\":\"${build_name}\",\"reportName\":\"${build_name} - ${build_date}\"}' > ./results/allure-results/executor.json; \
     npx allure-commandline generate ./results/allure-results -o ./results/allure-report --clean || true; \
     rm -rf ./results/.history; \
     cp -r ./results/allure-report/history ./results/.history 2>/dev/null || true"
}

run_specific() {
  local spec="$*"
  local count=$(generate_executor)
  local build_name="Run #${count}"
  local build_date=$(date '+%d/%m/%Y %H:%M')
  docker compose run --rm testes sh -c \
    "mkdir -p ./results/allure-results ./results/.history; \
     cp -r ./results/.history/. ./results/allure-results/history 2>/dev/null || true; \
     rm -f ./results/allure-results/*-result.json ./results/allure-results/*-attachment.* ./results/allure-results/executor.json ./results/allure-results/environment.properties; \
     npx playwright test ${spec}; \
     node allure-suite-fixer.js; \
     printf '{\"name\":\"QA Local\",\"type\":\"local\",\"buildOrder\":${count},\"buildName\":\"${build_name}\",\"reportName\":\"${build_name} - ${build_date}\"}' > ./results/allure-results/executor.json; \
     npx allure-commandline generate ./results/allure-results -o ./results/allure-report --clean || true; \
     rm -rf ./results/.history; \
     cp -r ./results/allure-report/history ./results/.history 2>/dev/null || true"
}

show_commands() {
  echo
  echo "Comandos disponíveis:"
  echo
  echo "  sh qa build          - (Re)Builda as imagens dos containers"
  echo "  sh qa setup          - Configura o ambiente para execução dos testes"
  echo "  sh qa test           - Executa todos os testes e gera relatório Allure"
  echo "  sh qa test:spec X    - Executa um spec específico e gera relatório"
  echo "  sh qa server-start   - Inicia servidor web para relatórios (localhost:2601)"
  echo "  sh qa server-stop    - Para o servidor web"
  echo
}

if [ $# -gt 0 ]; then
  case "$1" in
    "build") build ;;
    "server-start") start_server_apache ;;
    "setup") setup ;;
    "server-stop") stop_server_apache ;;
    "test") run_tests ;;
    "test:spec") shift; run_specific "$@" ;;
    *) show_commands ;;
  esac
else
  show_commands
fi
```

#### Fluxo de execução detalhado:

1. `generate_executor` — incrementa `.run-counter` no host (tem permissão de escrita)
2. Dentro do container:
   - Copia `results/.history/` → `allure-results/history/` (histórico acumulado)
   - Limpa apenas JSONs de resultado antigos (preserva `history/`)
   - Roda Playwright
   - Roda `allure-suite-fixer.js` (corrige labels)
   - Gera `executor.json` com número da run e data
   - `allure generate --clean` (gera relatório com histórico)
   - Copia `allure-report/history/` → `.history/` (persiste para próxima run)

#### Resetar histórico:

```bash
rm -f docker/playwright/.run-counter
rm -rf results/.history
```

### 2.5 .gitignore (`docker/playwright/.gitignore`)

```
.env
.run-counter
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
  workers: 1,
  reporter: [
    ['./clean-reporter.js'],
    ['html', { outputFolder: './results/html', open: 'never' }],
    ['allure-playwright', {
      resultsDir: './results/allure-results',
      detail: true,
      suiteTitle: false,
      environmentInfo: {
        API_URL: process.env.RESOURCES_URL || 'http://localhost:3000/',
        DB_HOST: process.env.DB_HOST || 'localhost',
        NODE_ENV: 'test',
      },
    }],
  ],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: process.env.RESOURCES_URL || 'http://localhost:3000/',
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
    "report": "npx playwright show-report ./results/html"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@types/pg": "^8.11.0",
    "@types/bcryptjs": "^2.4.6",
    "pg": "^8.12.0",
    "dotenv": "^16.4.0",
    "bcryptjs": "^2.4.3",
    "typescript": "^5.6.0",
    "allure-playwright": "^3.0.0",
    "allure-commandline": "^2.33.0"
  }
}
```

### 3.3 clean-reporter.js (reporter customizado — terminal limpo)

```javascript
class CleanReporter {
  passed = 0;
  failed = 0;
  skipped = 0;

  onTestEnd(test, result) {
    const icon = result.status === 'passed' ? '✓'
      : result.status === 'failed' ? '✗' : '○';
    const color = result.status === 'passed' ? '\x1b[32m'
      : result.status === 'failed' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    const duration = `(${result.duration}ms)`;
    const parts = test.titlePath();
    const describeAndTest = parts.slice(-2).join(' › ');
    console.log(`  ${color}${icon}${reset}  ${describeAndTest} ${duration}`);

    if (result.status === 'passed') this.passed++;
    else if (result.status === 'failed') this.failed++;
    else this.skipped++;

    if (result.status === 'failed' && result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`\n    ${error.message}\n`);
      }
    }
  }

  onEnd(result) {
    const total = this.passed + this.failed + this.skipped;
    const parts = [];
    if (this.passed) parts.push(`\x1b[32m${this.passed} passed\x1b[0m`);
    if (this.failed) parts.push(`\x1b[31m${this.failed} failed\x1b[0m`);
    if (this.skipped) parts.push(`\x1b[33m${this.skipped} skipped\x1b[0m`);
    console.log(`\n  ${parts.join(', ')} (${total} total)\n`);
  }
}
module.exports = CleanReporter;
```

### 3.4 allure-suite-fixer.js (agrupamento por módulo + behaviors)

O fixer pós-processa os JSONs de resultado para organizar o relatório em:
- **Suites:** `parentSuite` (módulo) > `suite` (Permissão | Campos Inválidos | Requests) > `subSuite` (describe)
- **Behaviors:** `feature` (módulo) > `story` (describe)

```javascript
/**
 * Pós-processador que corrige os labels de suite nos allure-results
 * para agrupar por módulo na view Suites e Behaviors do Allure.
 *
 * Resultado esperado (Suites):
 *   parentSuite: Usuario
 *   suite: Permissão | Campos Inválidos | Requests
 *   subSuite: Attempt POST /usuarios | Attempt POST /usuarios - Campos Inválidos | ...
 *
 * Resultado esperado (Behaviors):
 *   feature: Usuario
 *   story: Attempt POST /usuarios | Attempt POST /usuarios - Campos Inválidos | ...
 */
const fs = require('fs');
const path = require('path');

// Quando roda dentro do container, results/ fica em __dirname/results/
// Quando roda no host, results/ fica na raiz do projeto
const localResults = path.resolve(__dirname, 'results/allure-results');
const rootResults = path.resolve(__dirname, '../../results/allure-results');
const resultsDir = fs.existsSync(localResults) ? localResults : rootResults;

if (!fs.existsSync(resultsDir)) {
  console.log('[allure-suite-fixer] Nenhum resultado encontrado.');
  process.exit(0);
}

const files = fs
  .readdirSync(resultsDir)
  .filter((f) => f.endsWith('-result.json'));

let count = 0;

for (const file of files) {
  const filePath = path.join(resultsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const fullName = data.fullName || '';
  const titlePath = data.titlePath || [];

  // Extrai módulo e tipo do spec
  let modulo = '';
  let isAttempt = false;
  let isInvalidFields = false;

  const fnMatch = fullName.match(/^([A-Za-z]+)\/(AttemptRequests\/)?/);

  if (fnMatch) {
    modulo = fnMatch[1];
    isAttempt = !!fnMatch[2];
  } else {
    // Attempt specs: fullName aponta pro template
    // titlePath contém o path do spec real
    for (const part of titlePath) {
      const match = part.match(/^([A-Za-z]+)\/(AttemptRequests\/)?/);
      if (match) {
        modulo = match[1];
        isAttempt = !!match[2];
        break;
      }
    }
  }

  if (!modulo) continue;

  // Detecta se é InvalidFields pelo nome do spec no titlePath
  for (const part of titlePath) {
    if (part.includes('InvalidFields')) {
      isInvalidFields = true;
      break;
    }
  }

  // Define suite baseado no tipo
  let suite;
  if (isInvalidFields) {
    suite = 'Campos Inválidos';
  } else if (isAttempt) {
    suite = 'Permissão';
  } else {
    suite = 'Requests';
  }

  // subSuite = o describe do teste (último elemento não-arquivo do titlePath)
  let subSuite = '';
  const describes = titlePath.filter(
    (p) =>
      !p.includes('.spec.ts') &&
      !p.includes('.ts:') &&
      !p.includes('.ts') &&
      p !== '..' &&
      p !== 'resources' &&
      p !== 'Templates' &&
      p !== modulo &&
      p.length > 0,
  );

  if (describes.length > 0) {
    subSuite = describes[describes.length - 1];
  }

  // Fallback: se não encontrou, usa o nome do arquivo
  if (!subSuite) {
    const fileMatch = fullName.match(/([^/]+)\.spec\.ts/);
    subSuite = fileMatch ? fileMatch[1] : 'Unknown';
  }

  // Remove labels existentes que vamos sobrescrever
  data.labels = (data.labels || []).filter(
    (l) =>
      !['parentSuite', 'suite', 'subSuite', 'feature', 'story'].includes(
        l.name,
      ),
  );

  // Adiciona labels de Suites (hierarquia na view Suites)
  data.labels.push(
    { name: 'parentSuite', value: modulo },
    { name: 'suite', value: suite },
    { name: 'subSuite', value: subSuite },
  );

  // Adiciona labels de Behaviors (hierarquia na view Behaviors)
  data.labels.push(
    { name: 'feature', value: modulo },
    { name: 'story', value: subSuite },
  );

  fs.writeFileSync(filePath, JSON.stringify(data));
  count++;
}

console.log(
  `[allure-suite-fixer] ${count} resultado(s) processado(s).`,
);
```

#### Hierarquia resultante no Allure:

**View Suites:**
```
├── Auth
│   ├── Permissão
│   │   ├── Attempt POST /auth/login
│   │   └── Attempt POST /auth/logout
│   ├── Campos Inválidos
│   │   └── Attempt POST /auth/login - Campos Inválidos
│   └── Requests
│       └── Auth Suite
├── Usuario
│   ├── Permissão
│   │   ├── Attempt POST /usuarios
│   │   └── Attempt GET /usuarios/me
│   ├── Campos Inválidos
│   │   └── Attempt POST /usuarios - Campos Inválidos
│   ├── Segurança
│   │   ├── Segurança POST /usuarios
│   │   └── Segurança PATCH /usuarios/:id
│   └── Requests
│       └── Usuario Suite
```

**View Behaviors:**
```
├── Feature: Auth
│   ├── Story: Attempt POST /auth/login
│   ├── Story: Attempt POST /auth/logout
│   └── Story: Auth Suite
├── Feature: Usuario
│   ├── Story: Attempt POST /usuarios
│   ├── Story: Attempt POST /usuarios - Campos Inválidos
│   ├── Story: Segurança POST /usuarios
│   └── Story: Usuario Suite
```

### 3.5 tsconfig.json (isolado dos testes)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": "."
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 4. CAMADA BASE (resources/Base/)

### 4.1 test-base.ts

```typescript
export { test, expect } from '@playwright/test';
```

### 4.2 constants.ts

Usar **objetos agrupados** como fonte única. Ver seção 11 para detalhes completos.

```typescript
export const HTTP = {
  OK: 200, CREATED: 201, NO_CONTENT: 204,
  BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403,
  NOT_FOUND: 404, METHOD_NOT_ALLOWED: 405, CONFLICT: 409,
  UNPROCESSABLE: 422, SERVER_ERROR: 500,
} as const;

export const RESOURCES_URL = process.env.RESOURCES_URL || 'http://localhost:3000/';
export const BASE_URL = RESOURCES_URL;

export const MSG = {
  CREDENCIAIS_INVALIDAS: 'Credenciais inválidas',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
  // ... todas as mensagens de erro do backend
} as const;

export const INVALID = {
  EMPTY: '', NULL: null as any, MAX_INT: Number.MAX_SAFE_INTEGER,
  EMAIL: 'nao-e-email', SHORT_PASSWORD: '123', SPECIAL_CHARS: '@#$%&*123',
  MIN_CHAR: 'aa', CHAR_256: '...', UUID: 'nao-e-um-uuid',
  UUID_INEXISTENTE: 'a0000000-0000-4000-a000-000000000000',
} as const;

export const ATTACK = {
  SQL_OR: "' OR 1=1 --", SQL_DROP: "'; DROP TABLE ...; --",
  XSS_SCRIPT: '<script>alert(1)</script>',
  MASS_ADMIN: 'SUPER_ADMIN', MASS_INACTIVE: false,
} as const;

export const MINIMUM_RECORD = 1;
export const EMAIL_UNAUTHORIZED = 'unauthorized@qa.test';
```

### 4.3 auth.ts

```typescript
import { APIRequestContext } from '@playwright/test';
import { BASE_URL, EMAIL_UNAUTHORIZED } from './constants';

export async function getTokenAuthenticate(
  request: APIRequestContext,
  user: { email: string; senha: string },
): Promise<any> {
  const response = await request.post(`${BASE_URL}auth/login`, {
    data: { email: user.email, senha: user.senha },
  });
  return response.json();
}

export async function generateHeaderAuthorization(
  request: APIRequestContext,
  user: { email: string; senha: string },
): Promise<Record<string, string>> {
  const tokens = await getTokenAuthenticate(request, user);
  return { Authorization: `Bearer ${tokens.accessToken}` };
}

export async function setHeaders(
  request: APIRequestContext,
  user: { email: string; senha: string },
): Promise<Record<string, string>> {
  if (user.email === EMAIL_UNAUTHORIZED) {
    return { Authorization: '' };
  }
  return generateHeaderAuthorization(request, user);
}
```

### 4.4 api.ts

```typescript
import { MINIMUM_RECORD } from './constants';
import { db } from '../Database/connection';

export async function executeDatabaseQuery(query: string, params?: any[]): Promise<any[] | null> {
  const result = await db.query(query, params);
  return result.rows.length >= MINIMUM_RECORD ? result.rows : null;
}

export async function executeDatabaseSqlString(sql: string, params?: any[]): Promise<void> {
  await db.query(sql, params);
}

export function getQueryResultValue(result: any[] | null): any {
  return result && result.length > 0 ? Object.values(result[0])[0] : null;
}

export function setCurrentTestExecutionTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 15);
  return now.toISOString();
}
```

### 4.5 request-logger.ts

```typescript
import { APIResponse, test } from '@playwright/test';

export async function logRequestResponse(
  method: string,
  url: string,
  body: any,
  headers: Record<string, string> | undefined,
  response: APIResponse,
): Promise<void> {
  try {
    const testInfo = test.info();
    const requestInfo = { method, url, headers: sanitizeHeaders(headers), body: body ?? null };
    await testInfo.attach(`Request: ${method} ${extractPath(url)}`, {
      body: JSON.stringify(requestInfo, null, 2),
      contentType: 'application/json',
    });

    let responseBody: any;
    try { responseBody = await response.json(); } catch { responseBody = await response.text(); }
    const responseInfo = { status: response.status(), statusText: response.statusText(), body: responseBody };
    await testInfo.attach(`Response: ${response.status()} ${response.statusText()}`, {
      body: JSON.stringify(responseInfo, null, 2),
      contentType: 'application/json',
    });
  } catch { /* ignora fora de contexto de teste */ }
}

function sanitizeHeaders(headers?: Record<string, string>) {
  if (!headers) return undefined;
  const s = { ...headers };
  if (s.Authorization) s.Authorization = s.Authorization.substring(0, 20) + '...';
  return s;
}

function extractPath(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}
```

### 4.6 helpers.ts

```typescript
export function generateRandomEmail(prefix = 'qa'): string {
  return `${prefix}.${Date.now()}@teste.qa`;
}

export function generateRandomName(prefix = 'QA'): string {
  return `${prefix} Teste ${Date.now()}`;
}
```

---

## 5. CAMADA DATABASE (resources/Database/)

### 5.1 connection.ts (com suporte SSL para Supabase/cloud)

```typescript
import { Pool } from 'pg';

const useSSL = process.env.DB_SSL === 'true';

export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

export async function connectDatabase(): Promise<void> { await db.query('SELECT 1'); }
export async function disconnectDatabase(): Promise<void> { await db.end(); }
```

### 5.2 database.ts

```typescript
import { db } from './connection';

// Adaptar para as tabelas do projeto (nomes exatos do banco)
export const SCHEMA = {
  USUARIO: '"Usuario"',
  // ... todas as tabelas
};

export async function cleanTestsData(executionTime: string): Promise<void> {
  const queries = [
    // Ordem inversa de FK — dependentes primeiro
    `DELETE FROM ${SCHEMA.USUARIO} WHERE "dataCriacao" >= $1`,
  ];
  for (const query of queries) {
    try { await db.query(query, [executionTime]); } catch (e) { console.warn(e); }
  }
}
```

---

## 6. CAMADA ROUTES (resources/Routes/)

Cada Route encapsula chamadas HTTP e **loga request/response no Allure**:

```typescript
import { APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../Base/constants';
import { setHeaders } from '../Base/auth';
import { logRequestResponse } from '../Base/request-logger';

export async function postLogin(request: APIRequestContext, payload: any) {
  const url = `${BASE_URL}auth/login`;
  const response = await request.post(url, { data: payload });
  await logRequestResponse('POST', url, payload, undefined, response);
  return response;
}

export async function getRecurso(request: APIRequestContext, usuario: any) {
  const url = `${BASE_URL}recurso`;
  const headers = await setHeaders(request, usuario);
  const response = await request.get(url, { headers });
  await logRequestResponse('GET', url, undefined, headers, response);
  return response;
}
```

---

## 7. CAMADA FIXTURES

A arquitetura de montagem de dados segue o padrão **Object Mother + Builder** em 4 camadas:

```
Factory (dados brutos) → DataBuilder (composição) → SeedBuilder (seleção) → Seed (execução)
```

### 7.1 DataFactories — Dados brutos por entidade (camada mais baixa)

Funções que retornam objetos com dados de uma entidade. Cada `target` é um cenário nomeado de forma descritiva. **NUNCA hardcodar dados em Seeds ou SeedBuilders — sempre usar Factories.**

```typescript
// DataFactories/UsuarioFactory.ts
export function factoryUsuario(target: string): UsuarioData {
  const usuarios: Record<string, UsuarioData> = {
    adm_to_manage_auth_suite: { nome: 'Admin Auth QA', email: 'adm@authsuite.qa', senha: 'Teste123!' },
    super_admin_to_manage_suite: { nome: 'Super Admin QA', email: 'superadmin@suite.qa', senha: 'Teste123!', perfil: 'SUPER_ADMIN' },
  };
  return usuarios[target];
}

// DataFactories/CampeonatoFactory.ts
export function factoryCampeonato(target: string): CampeonatoData {
  const campeonatos: Record<string, CampeonatoData> = {
    campeonato_for_temporada_suite: { nome: 'Campeonato Temporada Suite QA' },
    campeonato_for_grupo_suite: { nome: 'Campeonato Grupo Suite QA' },
  };
  return campeonatos[target];
}
```

**Responsabilidade:** Definir os valores fixos de cada cenário. Fonte única de verdade para dados de teste.

### 7.2 DataBuilder — Composição central (orquestrador)

Compõe dados de múltiplas factories em pacotes prontos por suite/cenário. SeedBuilders chamam `build()` para obter dados compostos.

```typescript
// Fixtures/DataBuilder.ts
import { factoryUsuario } from './DataFactories/UsuarioFactory';
import { factoryCampeonato } from './DataFactories/CampeonatoFactory';
import { factoryTemporada } from './DataFactories/TemporadaFactory';

export function build(target: string, scenario: string, key?: string): any {
  const data = {
    for_temporada_suite: {
      user_manage: {
        usuario: factoryUsuario('user_to_manage_campeonato_suite'),
        campeonato: factoryCampeonato('campeonato_for_temporada_suite'),
        temporada: factoryTemporada('temporada_to_manage_suite'),
      },
    },
    for_grupo_suite: {
      user_admin: {
        usuario: factoryUsuario('user_to_manage_grupo_suite'),
        campeonato: factoryCampeonato('campeonato_for_grupo_suite'),
        temporada: factoryTemporada('temporada_for_grupo_suite'),
        grupo: factoryGrupo('grupo_to_manage_suite'),
      },
      user_member: {
        usuario: factoryUsuario('user_member_grupo_suite'),
      },
    },
  };
  const result = data[target][scenario];
  return key ? result[key] : result;
}
```

**Responsabilidade:** Centralizar a composição. Quando uma relação muda, só altera num lugar.

### 7.3 SeedBuilders — Seleção por suite (o que cada suite precisa)

Cada SeedBuilder define quais cenários a suite precisa, chamando `DataBuilder.build()`. Exporta:
- `seedUsuariosFor[Modulo]Suite()` — lista de dados para o CRUD spec
- `[MODULO]_ATTEMPT_USUARIOS` — mapa de usuários para AttemptRequests
- `seed[Modulo]Attempt()` — seed para AttemptRequests

```typescript
// SeedBuilders/TemporadaSuiteSeedBuilder.ts
import { build } from '../DataBuilder';
import { createUsuario, createUsuarios } from '../../Database/UsuarioDatabase';
import { insertCampeonato, selectCampeonatoByNome } from '../../Database/CampeonatoDatabase';

export const TEMPORADA_ATTEMPT_USUARIOS = {
  user: build('for_temporada_suite', 'user_manage', 'usuario'),
  super_admin: build('for_temporada_suite', 'super_admin', 'usuario'),
};

export async function seedTemporadaAttempt(): Promise<void> {
  await createUsuarios([build('for_temporada_suite', 'user_manage', 'usuario')]);
  await createUsuario(build('for_temporada_suite', 'super_admin', 'usuario'));
  const campeonato = build('for_temporada_suite', 'user_manage', 'campeonato');
  await insertCampeonato(campeonato.nome);
}

export async function seedTemporadaAttemptWithCampeonato(): Promise<{ campeonatoId: string }> {
  await seedTemporadaAttempt();
  const campeonato = build('for_temporada_suite', 'user_manage', 'campeonato');
  const campeonatoId = await selectCampeonatoByNome(campeonato.nome);
  return { campeonatoId: campeonatoId! };
}
```

**Responsabilidade:** Montar a lista de dados que precisa existir no banco antes de uma suite rodar.

### 7.4 MockDataBuilders — Payloads de request (camada paralela)

Diferente das camadas acima (que populam o banco), os MockDataBuilders montam payloads e rotas para chamadas HTTP nos AttemptRequests. **Separam dados de banco (seed) dos dados de request (payload).**

```typescript
// MockDataBuilders/AuthMockDataBuilder.ts
export function buildAuthMock(endpoint: string, overrides?: Record<string, any>) {
  const mocks: Record<string, { route: string; payload?: Record<string, any> }> = {
    post_login: { route: 'auth/login', payload: { email: 'adm@authsuite.qa', senha: 'Teste123!' } },
    post_logout: { route: 'auth/logout', payload: { refreshToken: 'qualquer' } },
  };
  const mock = { ...mocks[endpoint] };
  if (overrides?.payload) mock.payload = { ...mock.payload, ...overrides.payload };
  if (overrides?.route) mock.route = overrides.route;
  return mock;
}
```

**Responsabilidade:** Fornecer dados para requisições HTTP (body, rota, filtros).

### 7.5 Setup compartilhado (para módulos com dependências complexas)

Quando os AttemptRequests precisam de infraestrutura via API (ex: criar grupo com admin + membro):

```typescript
// SeedBuilders/GrupoAttemptSetup.ts
export async function setupGrupoComMembros(
  request: APIRequestContext,
  adminUser: { email: string; senha: string },
  membroUser: { email: string; senha: string },
  sufixo: string,
): Promise<{ grupoId: string; codigoConvite: string }> {
  // Cria campeonato → temporada → grupo → membro entra via API
  // Retorna IDs para uso nos cenários
}
```

### 7.6 Fluxo completo (resumo visual)

```
CRUD Spec (.spec.ts)
└── beforeAll: seedingForGrupoSuite()
    └── Seeds/GrupoSeed.ts
        └── SeedBuilders/GrupoSuiteSeedBuilder.ts
            └── DataBuilder.build('for_grupo_suite', 'user_admin')
                ├── factoryUsuario('user_to_manage_grupo_suite')
                ├── factoryCampeonato('campeonato_for_grupo_suite')
                └── factoryTemporada('temporada_for_grupo_suite')
        └── Database/CampeonatoDatabase.insertCampeonato(nome)
        └── Database/TemporadaDatabase.insertTemporada(campeonatoId, ano)

AttemptRequest Spec (.spec.ts)
└── describeAttemptSuite(test, { seed: seedGrupoAttempt, ... })
    └── SeedBuilders/GrupoSuiteSeedBuilder.seedGrupoAttempt()
        └── DataBuilder.build('for_grupo_suite', 'user_admin', 'usuario')
        └── Database/UsuarioDatabase.createUsuarios(...)
```

### 7.7 Regras da camada Fixtures

- **NUNCA hardcodar dados** em Seeds, SeedBuilders ou Specs — sempre usar Factory via DataBuilder
- **Factory** = dados brutos de uma entidade (usado em CRUD specs via `factoryUsuario('target')`)
- **DataBuilder** = composição de múltiplas factories (usado em SeedBuilders via `build(target, scenario)`)
- **SeedBuilder** = seleção por suite (define o que cada suite precisa)
- **MockDataBuilder** = payloads de request (usado em AttemptRequests)
- **Seed** = execução (chama SeedBuilder + Database helpers para inserir no banco)

---

## 8. CAMADA TEMPLATES (resources/Templates/)

Cada template tem uma **única responsabilidade**. Nunca misturar lógicas de domínios diferentes no mesmo arquivo.

```
Templates/
├── PermissionTemplate.ts       → Controle de acesso (quem pode acessar)
├── InvalidFieldsTemplate.ts    → Validação de payload (input malformado)
├── SecurityTemplate.ts         → Ataques e edge cases (SQL Injection, XSS, Mass Assignment, Concorrência, Stacktrace)
└── ResponseEvaluator.ts        → Avaliação de comportamento de resposta
```

### 8.1 PermissionTemplate.ts — Controle de acesso por perfil

Exporta:

1. **`describeAttemptSuite(test, params)`** — Orquestrador de suite de permissão.
2. **`attemptRequest(request, scenario, config)`** — Executa requisição e valida status por perfil.
3. **`attemptRequestForRules(request, params)`** — Testa regras com avaliação de comportamento.
4. **`attemptRequestForRulesAuthorized(request, params)`** — Valida que perfil TEM acesso.
5. **`runAttemptSetup(config, request?)`** — Helper para beforeAll.

```typescript
export interface AttemptScenario {
  perfil: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  statusEsperado: number;
  skip?: string; // Motivo para pular o cenário
}

export interface AttemptSuiteParams {
  descricao: string;
  scenarios: AttemptScenario[];
  usuarios: Record<string, { email: string; senha: string }>;
  mockData?: { route: string; payload?: Record<string, any> };
  seed?: () => Promise<void>;
  setup?: (request: APIRequestContext) => Promise<Record<string, any>>;
  routeResolver?: (setupData: Record<string, any>) => string;
  payloadResolver?: (setupData: Record<string, any>) => Record<string, any>;
}

export function describeAttemptSuite(t: typeof test, params: AttemptSuiteParams): void {
  // ...
}
```

### 8.2 InvalidFieldsTemplate.ts — Validação de payload

Exporta:

1. **`describeInvalidFieldSuite(test, params)`** — Orquestrador de suite de campos inválidos.
2. **`attemptWithInvalidField(request, params)`** — Testa um campo inválido com validação de mensagem.

```typescript
export type InvalidFieldTuple = [string, any, number, string, string?];
// [campo, valor, statusEsperado, mensagem, skip?]

export interface InvalidFieldSuiteParams {
  descricao: string;
  scenarios: InvalidFieldTuple[];
  usuario: { email: string; senha: string };
  route: string;
  basePayload: Record<string, any>;
  seed?: () => Promise<void>;
  uniqueFieldResolver?: (index: number, campo: string) => Record<string, any>;
}

export function describeInvalidFieldSuite(t: typeof test, params: InvalidFieldSuiteParams): void {
  // ...
}
```

### 8.3 SecurityTemplate.ts — Testes de segurança

Template reutilizável para qualquer endpoint/projeto. Testa a API via HTTP — **agnóstico de linguagem do backend**.

Exporta:

1. **`describeSecuritySuite(test, params)`** — Orquestrador que gera testes de:
   - **SQL Injection** — N payloads × N campos. Valida que nunca retorna 500 e nunca expõe SQL/stacktrace.
   - **XSS** — Payloads com `<script>`, `onerror`, event handlers. Valida Content-Type JSON.
   - **Mass Assignment** — Campos sensíveis (perfil, ativo, role). Valida que não são aplicados.
   - **Concorrência** — N requests simultâneas com mesmo valor único. Valida que apenas 1 é criada.
   - **Stacktrace Leak** — Payload que força erro. Valida que não expõe internals.

```typescript
export interface SecuritySuiteParams {
  descricao: string;
  route: string;
  method: HttpMethod;
  basePayload: Record<string, any>;
  usuario?: { email: string; senha: string }; // undefined = rota pública
  seed?: () => Promise<void>;
  cleanup?: () => Promise<void>;

  sqlInjection?: {
    campos: string[];
    statusEsperado: number | number[];
  };
  xss?: {
    campos: string[];
    statusEsperado: number | number[];
  };
  massAssignment?: {
    camposSensiveis: Record<string, any>;
    statusEsperado: number | number[];
    validar: (body: any) => void | Promise<void>;
  };
  concorrencia?: {
    campoUnico: string;
    valorUnico: () => string;
    statusConflito: number;
    requests?: number; // default: 5
    cleanup?: (valor: string) => Promise<void>;
  };
  stacktrace?: {
    payloadQueForcaErro: Record<string, any>;
  };
}

export function describeSecuritySuite(t: typeof test, params: SecuritySuiteParams): void {
  // ...
}
```

**Constantes de payloads de ataque** (em `constants.ts`):

```typescript
// SQL Injection
export const SQL_OR_1_1 = "' OR 1=1 --";
export const SQL_DROP_TABLE = "'; DROP TABLE \"Usuario\"; --";
export const SQL_UNION_SELECT = "' UNION SELECT * FROM \"Usuario\" --";
export const SQL_COMMENT = "admin'--";

// XSS
export const XSS_SCRIPT_ALERT = '<script>alert(1)</script>';
export const XSS_IMG_ONERROR = '<img src=x onerror=alert(1)>';
export const XSS_EVENT_HANDLER = '" onmouseover="alert(1)"';
```

### 8.4 ResponseEvaluator.ts

```typescript
export function evaluateResponseBehavior(status: number, body: any, isPublicRoute: boolean): void {
  if (status === 500) throw new Error(`QA: 500 - ALTA PRIORIDADE!`);
  if (status === 200 && !isPublicRoute) throw new Error(`QA: 200 - Avaliar acesso sem regras.`);
  if (status === 422 && !isPublicRoute) throw new Error(`QA: 422 - Deveria validar acesso ANTES.`);
  if (status === 404 && !isPublicRoute) throw new Error(`QA: 404 - Deveria validar acesso ANTES.`);
}

export function evaluateResponseForRulesAuthorized(status: number): void {
  if (status === 500) throw new Error(`QA: 500 - ALTA PRIORIDADE!`);
  if (status === 403 || status === 401) throw new Error(`QA: ${status} - Deveria ter acesso.`);
  if (status === 405) throw new Error(`QA: 405 - Avaliar rota.`);
}
```

---

## 9. CAMADA SPECS

### 9.1 Padrão de imports (OBRIGATÓRIO)

Todo spec importa do barrel file `resources/index.ts`. Usar objetos agrupados (`HTTP`, `INVALID`, `ATTACK`).

```typescript
// Specs de CRUD (usam test.step, setup/cleanup próprios):
import { test, expect } from '../../resources';
import * as API from '../../resources';

// Specs de AttemptRequests (named imports agrupados por contexto):
import {
  test, HTTP, INVALID,
  describeAttemptSuite, buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt, UsuarioDB,
} from '../../../resources';

// Specs de Security (named imports + expect):
import {
  test, expect, HTTP, ATTACK,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt,
  UsuarioDB, UsuarioRoute,
} from '../../../resources';
```

### 9.2 Spec de CRUD (exemplo)

```typescript
import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Auth Suite', () => {
  test.beforeAll(async () => { await API.seedingForAuthSuite(); });

  test('Caso 01 - Realizar login com sucesso', async ({ request }) => {
    const usuario = API.factoryUsuario('adm_to_manage_auth_suite');
    const response = await API.AuthRoute.postLogin(request, { email: usuario.email, senha: usuario.senha });
    const body = await response.json();
    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('accessToken');
  });
});
```

### 9.3 Spec de AttemptRequests (exemplo — padrão final)

**1 arquivo = 1 endpoint. Nomeado pelo método HTTP: `PostLogin.spec.ts`, `GetUsuarios.spec.ts`, `PatchGrupo.spec.ts`**

```typescript
// specs/Auth/AttemptRequests/PostLogin.spec.ts
import {
  test,
  HTTP_CREATED,
  describeAttemptSuite,
  buildAuthMock,
  AUTH_ATTEMPT_USUARIOS,
  seedAuthAttempt,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /auth/login',
  scenarios: [
    { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'user', method: 'POST', statusEsperado: HTTP_CREATED },
    { perfil: 'super_admin', method: 'POST', statusEsperado: HTTP_CREATED },
  ],
  usuarios: AUTH_ATTEMPT_USUARIOS,
  mockData: buildAuthMock('post_login'),
  seed: seedAuthAttempt,
});
```

### 9.4 Spec de AttemptRequests com setup dinâmico (exemplo)

**Regra: quando o setup precisa de um ID, buscar direto no banco — NUNCA chamar outro endpoint.**

#### 9.4.1 Setup simples — busca ID da própria entidade no banco

```typescript
// specs/Usuario/AttemptRequests/PatchUsuario.spec.ts
import {
  test, HTTP,
  describeAttemptSuite,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttemptWithId,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /usuarios/:id',
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  seed: seedUsuarioAttemptWithId,
  routeResolver: (data) => `usuarios/${data.userId}`,
  payloadResolver: () => ({ nome: `Attempt Patch ${Date.now()}` }),
  scenarios: [
    ['sem_token',     'PATCH', HTTP.UNAUTHORIZED, 'sem autenticação'],
    ['usuario_comum', 'PATCH', HTTP.OK,           'atualizando próprio perfil'],
    ['super_admin',   'PATCH', HTTP.OK,           'admin atualizando outro usuário'],
  ],
});
```

#### 9.4.2 Setup com dependência entre entidades — cria entidade-pai no banco

**Regra: quando o endpoint depende de outra entidade (ex: Temporada depende de Campeonato), o `seed` DEVE criar a entidade-pai via INSERT direto no banco e retornar o ID. O `payloadResolver` usa esse ID para montar o payload com dados reais.**

Padrão no SeedBuilder:
```typescript
// SeedBuilders/TemporadaSuiteSeedBuilder.ts
const CAMPEONATO_TEMPORADA_SEED = 'Campeonato Temporada Attempt QA';

export async function seedTemporadaAttemptWithCampeonato(): Promise<{ campeonatoId: string }> {
  await seedTemporadaAttempt(); // cria usuários
  await insertCampeonato(CAMPEONATO_TEMPORADA_SEED); // cria dependência no banco
  const campeonatoId = await selectCampeonatoByNome(CAMPEONATO_TEMPORADA_SEED);
  return { campeonatoId: campeonatoId! };
}
```

Padrão no Spec:
```typescript
// specs/Temporada/AttemptRequests/PostTemporada.spec.ts
import {
  test, HTTP,
  describeAttemptSuite,
  TEMPORADA_ATTEMPT_USUARIOS, seedTemporadaAttemptWithCampeonato,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt POST /temporadas',
  usuarios: TEMPORADA_ATTEMPT_USUARIOS,
  seed: seedTemporadaAttemptWithCampeonato,
  routeResolver: () => 'temporadas',
  payloadResolver: (data) => ({ ano: 2026, campeonatoId: data.campeonatoId }),
  scenarios: [
    ['sem_token',   'POST', HTTP.UNAUTHORIZED, 'sem autenticação'],
    ['user',        'POST', HTTP.CREATED,      'criando temporada com campeonato válido'],
    ['super_admin', 'POST', HTTP.CREATED,      'admin criando temporada'],
  ],
});
```

**Princípios:**
- O `seed` retorna um objeto com os IDs necessários (ex: `{ campeonatoId }`, `{ grupoId, codigoConvite }`)
- O `payloadResolver` recebe esse objeto via `data` e monta o payload com IDs reais
- O `routeResolver` também pode usar `data` para rotas com params (ex: `grupos/${data.grupoId}`)
- NUNCA usar UUID inexistente quando o objetivo é testar o fluxo de sucesso (201)
- UUID inexistente é válido apenas para testar cenários de erro (404, 403)

#### 9.4.3 Setup complexo — múltiplas entidades com relacionamento

```typescript
// specs/Grupo/AttemptRequests/PatchGrupo.spec.ts
describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /grupos/:id',
  usuarios: GRUPO_ATTEMPT_USUARIOS,
  seed: seedGrupoAttempt,
  setup: (request) => setupGrupoComMembros(
    request,
    GRUPO_ATTEMPT_USUARIOS.admin_grupo,
    GRUPO_ATTEMPT_USUARIOS.membro_grupo,
    'PatchAttempt',
  ),
  routeResolver: (data) => `grupos/${data.grupoId}`,
  payloadResolver: () => ({ nome: `Attempt Patch ${Date.now()}` }),
  scenarios: [
    ['sem_token',    'PATCH', HTTP.UNAUTHORIZED, 'sem autenticação'],
    ['admin_grupo',  'PATCH', HTTP.OK,           'admin do grupo atualizando'],
    ['membro_grupo', 'PATCH', HTTP.FORBIDDEN,    'membro sem permissão'],
    ['user_fora',    'PATCH', HTTP.FORBIDDEN,    'usuário fora do grupo'],
  ],
});
```

### 9.5 Spec de Security (exemplo)

**1 arquivo = 1 endpoint. Pasta `Security/` dentro do módulo.**

```typescript
// specs/Usuario/Security/PostUsuarioSecurity.spec.ts
import { test, expect } from '../../../resources';
import * as API from '../../../resources';
import { describeSecuritySuite } from '../../../resources';

describeSecuritySuite(test, {
  descricao: 'Segurança POST /usuarios',
  route: 'usuarios',
  method: 'POST',
  basePayload: {
    nome: 'Security QA',
    email: `security.${Date.now()}@teste.qa`,
    senha: 'Teste123!',
  },
  // Rota pública — sem usuario (não envia token)

  sqlInjection: {
    campos: ['email', 'nome'],
    statusEsperado: [API.HTTP_UNPROCESSABLE_ENTITY, API.HTTP_BAD_REQUEST, API.HTTP_CREATED],
  },
  xss: {
    campos: ['nome'],
    statusEsperado: [API.HTTP_UNPROCESSABLE_ENTITY, API.HTTP_CREATED],
  },
  massAssignment: {
    camposSensiveis: { perfil: 'SUPER_ADMIN', ativo: false },
    statusEsperado: [API.HTTP_CREATED, API.HTTP_UNPROCESSABLE_ENTITY],
    validar: (body) => {
      if (body.perfil) expect(body.perfil).not.toBe('SUPER_ADMIN');
      if (body.ativo !== undefined) expect(body.ativo).not.toBe(false);
    },
  },
  concorrencia: {
    campoUnico: 'email',
    valorUnico: () => `race.${Date.now()}@concorrencia.qa`,
    statusConflito: API.HTTP_CONFLICT,
    requests: 5,
    cleanup: async (email) => { await API.UsuarioDB.deleteUsuarioByEmail(email); },
  },
  stacktrace: {
    payloadQueForcaErro: { email: null, senha: null, nome: null },
  },
});
```

### 9.6 Isolamento de testes (OBRIGATÓRIO)

Cada teste DEVE ser independente e paralelizável:

- **Setup próprio** — cada teste cria seus dados com identificador único (`Date.now()`)
- **Sem cleanup inline** — o global-teardown limpa tudo automaticamente após a execução
- **Sem estado compartilhado** — NUNCA usar variáveis entre testes
- **Sem `mode: 'serial'`** — testes não devem depender de ordem de execução
- **Prefixo `qa.`** — emails de teste usam `qa.caso01.${Date.now()}@dominio.qa`

```typescript
test('Caso 01 - Criar usuário', async ({ request }) => {
  // Setup — dados únicos para este teste
  const email = `qa.caso01.${Date.now()}@post.qa`;
  const payload = { nome: 'QA', email, senha: 'Teste123!' };

  const response = await API.UsuarioRoute.postUsuario(request, payload);
  expect(response.status()).toBe(API.HTTP_CREATED);

  // Sem cleanup — global-teardown cuida
});
```

### 9.7 test.step para legibilidade no Allure (OBRIGATÓRIO)

Usar `test.step()` para agrupar asserções com nomes descritivos. Sem isso, o Allure mostra apenas `Expect "toBe"` genérico.

```typescript
test('Caso 03 - Buscar perfil', async ({ request }) => {
  const response = await API.UsuarioRoute.getUsuarioMe(request, usuario);
  const body = await response.json();

  await test.step('Deve retornar 200 OK', async () => {
    expect(response.status()).toBe(API.HTTP_OK);
  });

  await test.step('Deve conter todos os campos do presenter', async () => {
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('nome');
    expect(body).toHaveProperty('email');
  });

  await test.step('Não deve expor campos sensíveis', async () => {
    expect(body).not.toHaveProperty('senha');
  });
});
```

### 9.8 Validação com banco de dados

Quando relevante, validar que a operação persistiu corretamente no banco:

```typescript
await test.step('Deve persistir o novo nome no banco de dados', async () => {
  const usuarioDB = await API.UsuarioDB.selectUsuarioById(me.id);
  expect(usuarioDB).not.toBeNull();
  expect(usuarioDB!.nome).toBe(novoNome);
});
```

### 9.9 auth.ts — opção `silent` para rotas públicas

O `setHeaders` aceita `{ silent: true }` para não logar "Usuário autenticado" no Allure quando a informação não agrega valor (ex: testes de campos inválidos, testes de segurança):

```typescript
const headers = await setHeaders(request, usuario, { silent: true });
```

### 9.10 Estratégia de limpeza de dados (OBRIGATÓRIO)

A limpeza opera via **Global Teardown** — uma única camada que cobre todos os specs.

#### Global Teardown (limpeza automática)

O `global-teardown.ts` executa após TODOS os testes e remove qualquer dado criado durante a execução:

```typescript
// global-setup.ts — captura timestamp ANTES dos testes
const executionTime = setCurrentTestExecutionTime(); // NOW() - 15min (margem)
fs.writeFileSync('.execution-time', executionTime);

// global-teardown.ts — deleta tudo criado após o timestamp
await cleanTestsData(executionTime);
```

O `cleanTestsData()` em `database.ts` deleta na **ordem inversa de FK** (dependentes primeiro):
```typescript
// Ordem: Palpite → Jogo → Fase → GrupoUsuario → Grupo → RefreshToken → Temporada → Campeonato → Usuario
DELETE FROM "Palpite" WHERE "dataCriacao" >= $1
DELETE FROM "GrupoUsuario" WHERE "dataCriacao" >= $1
DELETE FROM "Grupo" WHERE "dataCriacao" >= $1
DELETE FROM "Temporada" WHERE "dataCriacao" >= $1
DELETE FROM "Campeonato" WHERE "dataCriacao" >= $1
DELETE FROM "Usuario" WHERE "dataCriacao" >= $1
```

Também limpa usuários de seed (criados via `ON CONFLICT` com `dataCriacao` antiga):
```typescript
DELETE FROM "Usuario" WHERE email LIKE '%.qa' OR email LIKE '%.qa.bolao'
```

#### Regras

- **NUNCA fazer cleanup inline nos specs** — o global-teardown cuida de tudo
- Seeds usam `ON CONFLICT` (idempotentes) — não acumulam lixo entre execuções
- Testes de CRUD criam dados com `Date.now()` no nome/email — garantem unicidade sem precisar deletar
- Testes de listagem verificam `Array.isArray(body)` — NUNCA contam registros ou assumem banco vazio
- Se um teste precisa verificar que algo NÃO existe (ex: após delete), buscar pelo ID específico no banco

#### Quando adicionar nova tabela

Ao criar um novo módulo com tabela no banco:
1. Adicionar a tabela em `SCHEMA` no `database.ts`
2. Adicionar o `DELETE` correspondente em `cleanTestsData()` **na posição correta** (antes das tabelas que ela referencia via FK)

---

## 10. BARREL FILE (resources/index.ts)

O barrel file DEVE exportar tudo. Toda vez que criar um novo arquivo, adicionar o export aqui.

```typescript
// ---- Playwright ----
export { test, expect } from './Base/test-base';

// ---- Base ----
export * from './Base/constants';
export * from './Base/helpers';
export * from './Base/auth';
export * from './Base/api';
export * from './Base/request-logger';

// ---- Database ----
export * from './Database/connection';
export * from './Database/database';
export * as UsuarioDB from './Database/[Entidade]Database';

// ---- DataFactories ----
export { factoryUsuario } from './Fixtures/DataFactories/UsuarioFactory';
export { factoryRoute, buildPublicRoutes } from './Fixtures/DataFactories/RouteFactory';

// ---- MockDataBuilders ----
export { buildAuthMock } from './Fixtures/MockDataBuilders/AuthMockDataBuilder';

// ---- SeedBuilders ----
export { AUTH_ATTEMPT_USUARIOS, seedAuthAttempt } from './Fixtures/SeedBuilders/AuthSuiteSeedBuilder';
export { setupGrupoComMembros } from './Fixtures/SeedBuilders/GrupoAttemptSetup';

// ---- Routes ----
export * as AuthRoute from './Routes/AuthRoute';
export * as UsuarioRoute from './Routes/UsuarioRoute';

// ---- Seeds ----
export * from './Seeds/AuthSeed';

// ---- Templates ----
export * from './Templates/PermissionTemplate';
export * from './Templates/InvalidFieldsTemplate';
export * from './Templates/SecurityTemplate';
export * from './Templates/ResponseEvaluator';
```

---

## 11. CONSTANTES — OBJETOS AGRUPADOS (OBRIGATÓRIO)

O arquivo `constants.ts` usa **objetos agrupados** como fonte única de verdade. NUNCA duplicar valores.

```typescript
// ---- HTTP Status Codes ----
export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  SERVER_ERROR: 500,
} as const;

// ---- Valores inválidos para testes de campo ----
export const INVALID = {
  EMPTY: '',
  NULL: null as any,
  MAX_INT: Number.MAX_SAFE_INTEGER,
  STRING: 'aaaa',
  EMAIL: 'nao-e-email',
  SHORT_PASSWORD: '123',
  SPECIAL_CHARS: '@#$%&*123',
  MIN_CHAR: 'aa',
  CHAR_256: '...',  // 256 chars
  UUID: 'nao-e-um-uuid',
  UUID_INEXISTENTE: 'a0000000-0000-4000-a000-000000000000',
} as const;

// ---- Payloads de ataque (segurança) ----
export const ATTACK = {
  SQL_OR: "' OR 1=1 --",
  SQL_DROP: "'; DROP TABLE \"Usuario\"; --",
  SQL_UNION: "' UNION SELECT * FROM \"Usuario\" --",
  SQL_COMMENT: "admin'--",
  XSS_SCRIPT: '<script>alert(1)</script>',
  XSS_IMG: '<img src=x onerror=alert(1)>',
  XSS_EVENT: '" onmouseover="alert(1)"',
  MASS_ADMIN: 'SUPER_ADMIN',
  MASS_INACTIVE: false,
} as const;

// ---- Mensagens de erro da API ----
export const MSG = {
  CREDENCIAIS_INVALIDAS: 'Credenciais inválidas',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
  // ... todas as mensagens do backend
} as const;
```

**Regras:**
- Specs usam `HTTP.OK`, `INVALID.EMPTY`, `ATTACK.SQL_OR` — NUNCA constantes individuais
- Templates internos também usam os objetos agrupados
- Aliases individuais (`HTTP_OK`, `UUID_INEXISTENTE`) existem apenas para compatibilidade com specs não migrados — remover quando padronizar

---

## 12. PADRÃO DE IMPORTS NOS SPECS (OBRIGATÓRIO)

### 12.1 Import padrão — named imports agrupados por contexto

```typescript
import {
  test, HTTP, INVALID,
  describeAttemptSuite, buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt, UsuarioDB,
} from '../../../resources';
```

**Regras:**
- Linha 1: `test` + objetos de constantes (`HTTP`, `INVALID`, `ATTACK`)
- Linha 2: templates e builders
- Linha 3: fixtures e database
- NUNCA usar `import * as API` nos AttemptRequests
- NUNCA usar named imports gigantes (15+ itens)

### 12.2 Padrão de cenários com tuplas (InvalidFields)

```typescript
import {
  test, HTTP, INVALID,
  describeInvalidFieldSuite, buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt,
} from '../../../resources';

const { route, payload } = buildUsuarioMock('post_usuario');

describeInvalidFieldSuite(test, {
  descricao: 'Attempt POST /usuarios - Campos Inválidos',
  route,
  usuario: USUARIO_ATTEMPT_USUARIOS.usuario_comum,
  basePayload: payload!,
  seed: seedUsuarioAttempt,
  uniqueFieldResolver: (i) => ({ email: `invalid.${i}.${Date.now()}@teste.qa` }),
  // prettier-ignore
  scenarios: [
    // [campo,   valor,                  status,           mensagem]
    ['nome',     INVALID.EMPTY,          HTTP.UNPROCESSABLE, 'Nome é obrigatório'],
    ['nome',     INVALID.NULL,           HTTP.UNPROCESSABLE, 'Nome é obrigatório'],
    ['nome',     INVALID.CHAR_256,       HTTP.UNPROCESSABLE, 'Nome deve ter no máximo 255 caracteres', 'Backend não valida'],
    ['email',    INVALID.EMAIL,          HTTP.UNPROCESSABLE, 'Email inválido'],
    ['senha',    INVALID.SHORT_PASSWORD, HTTP.UNPROCESSABLE, 'Senha deve ter no mínimo 6 caracteres'],
  ],
});
```

### 12.3 Padrão de cenários com routeOverride (Permissão + Params inválidos)

Tudo num único arquivo por endpoint — permissão E params inválidos juntos:

```typescript
import {
  test, HTTP, INVALID,
  describeAttemptSuite,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt, UsuarioDB,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt GET /usuarios/:id',
  scenarios: [
    // Permissão
    { perfil: 'sem_token', method: 'GET', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP.OK },
    { perfil: 'super_admin', method: 'GET', statusEsperado: HTTP.OK },
    // Params inválidos
    { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP.BAD_REQUEST, routeOverride: `usuarios/${INVALID.UUID}` },
    { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP.FORBIDDEN, routeOverride: `usuarios/${INVALID.UUID_INEXISTENTE}` },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  seed: seedUsuarioAttempt,
  setup: async () => {
    const userId = await UsuarioDB.selectUsuarioByEmail(USUARIO_ATTEMPT_USUARIOS.usuario_comum.email);
    return { userId };
  },
  routeResolver: (data) => `usuarios/${data.userId}`,
});
```

### 12.4 Campo `skip` — Mapeamento de bugs/melhorias

Quando um cenário falha porque o **backend não implementou a validação**, NÃO remover o cenário. Adicionar `skip` com o motivo:

```typescript
['nome', INVALID.CHAR_256, HTTP.UNPROCESSABLE, 'Nome deve ter no máximo 255 caracteres', 'Backend não valida @MaxLength'],
```

O teste aparece como **skipped** no relatório. Quando o backend corrigir, basta remover o `skip`.

### 12.5 Campo `skip` nos AttemptRequests de permissão

O mesmo padrão se aplica ao `describeAttemptSuite`:

```typescript
scenarios: [
  { perfil: 'sem_token', method: 'POST', statusEsperado: HTTP.CREATED },
  { perfil: 'usuario_comum', method: 'GET', statusEsperado: HTTP.METHOD_NOT_ALLOWED, skip: 'Backend retorna 404 em vez de 405' },
],
```

---

## 13. ISOLAMENTO DO TYPESCRIPT (OBRIGATÓRIO)

Após criar a estrutura, SEMPRE verificar e ajustar os arquivos do projeto host:

**tsconfig.json do host** — adicionar `"tests/Integration"` no exclude:
```json
{ "exclude": ["node_modules", "dist", "tests/Integration"] }
```

**tsconfig.build.json do host** — adicionar `"tests"` no exclude:
```json
{ "exclude": ["node_modules", "test", "tests", "dist", "**/*spec.ts"] }
```

**ESLint do host** — adicionar `tests/Integration/**` no ignores:
```javascript
{ ignores: ['eslint.config.mjs', 'tests/Integration/**'] }
```

**Instalar dependências localmente** (para IDE) — opcional, só para resolver tipos:
```bash
npm install --prefix=tests/Integration
```

---

## 14. RELATÓRIO ALLURE — TENDÊNCIA E HISTÓRICO

### 14.1 Gráfico de Tendência

O Allure exibe um gráfico de tendência (stacked area) na Overview mostrando a evolução de passed/failed/skipped ao longo das execuções.

**Como funciona:**
- `results/.history/` persiste o histórico entre execuções (não é apagado pelo `--clean`)
- Antes de cada run, o script copia `.history/` → `allure-results/history/`
- Depois de gerar o relatório, copia `allure-report/history/` → `.history/`
- O `executor.json` adiciona labels ("Run #1", "Run #2") no eixo X do gráfico

**Resetar histórico:**
```bash
rm -f docker/playwright/.run-counter
rm -rf results/.history
```

### 14.2 executor.json

Gerado dentro do container a cada execução:
```json
{
  "name": "QA Local",
  "type": "local",
  "buildOrder": 1,
  "buildName": "Run #1",
  "reportName": "Run #1 - 11/05/2026 20:35"
}
```

O `buildOrder` é o número sequencial da run. O `buildName` aparece como label no gráfico de tendência e na seção "Executors" da Overview.

### 14.3 .gitignore do host

Adicionar ao `.gitignore` do projeto host:
```gitignore
# Playwright Integration Tests — resultados gerados no Docker
/results/allure-report/
/results/allure-results/
/results/html/
/results/index.html
/results/.history/
/results/.run-counter
/tests/Integration/node_modules/
/tests/Integration/test-results/
```

---

## 15. INSTRUÇÕES PARA O AGENTE

1. **Se já existirem specs em `tests/Integration/specs/`, inspecionar os existentes para manter consistência de estilo, nomes e padrões de implementação.** Se não existirem, criar do zero seguindo este prompt.
2. Inspecionar o `docker-compose.yml` do projeto host para definir estratégia de rede.
2. Inspecionar o banco (Prisma schema, migrations) para montar `SCHEMA` e `cleanTestsData`.
3. Inspecionar controllers para mapear todas as rotas, guards e decorators.
4. Verificar qual status code o backend retorna para validação de campos (400 ou 422).
5. Criar TODA a estrutura de pastas conforme seção 1.
6. Implementar camadas na ordem: Docker → Config → Base → Database → Fixtures → Routes → Seeds → Templates → Specs.
7. Para cada endpoint, criar: AttemptRequests (permissão) + InvalidFields (validação de payload) + Security (segurança).
8. Manter 1 arquivo = 1 endpoint nos AttemptRequests e Security.
9. Usar `describeAttemptSuite` para permissão, `describeInvalidFieldSuite` para campos inválidos e `describeSecuritySuite` para segurança.
10. Usar constantes de `constants.ts` para valores inválidos e payloads de ataque — NUNCA valores literais nos cenários.
11. Usar `// prettier-ignore` antes de arrays de cenários para preservar formato tabular.
12. Cenários que mapeiam bugs do backend usam `skip` com motivo — NUNCA remover o cenário.
13. Toda vez que criar um arquivo novo, adicionar export no `resources/index.ts`.
14. Após criar a estrutura, ajustar `tsconfig.json`, `tsconfig.build.json` e ESLint do host.
15. Gerar `README.md` dentro de `tests/Integration/` documentando a estrutura.
16. Rodar Prettier em todos os arquivos antes de finalizar.
17. Cada teste DEVE ser independente — dados únicos via `Date.now()`, sem estado compartilhado, paralelizável. Limpeza é feita pelo global-teardown — NUNCA fazer cleanup inline nos specs.
18. Usar `test.step()` para agrupar asserções com nomes descritivos no Allure.
19. Usar `{ silent: true }` no `setHeaders` quando o log "Usuário autenticado" não agrega valor.
20. Templates separados por responsabilidade: `PermissionTemplate`, `InvalidFieldsTemplate`, `SecurityTemplate`.
21. NUNCA usar `mode: 'serial'` — testes devem rodar em qualquer ordem.
22. Quando o setup precisa de um ID (ex: rota com `:id`), buscar direto no banco via `Database` — NUNCA chamar outro endpoint para obter o ID.
23. Quando o endpoint depende de outra entidade (ex: Temporada depende de Campeonato), o `seed` DEVE criar a entidade-pai via INSERT no banco e retornar o ID. O `payloadResolver` usa esse ID para montar o payload com dados reais. NUNCA usar UUID inexistente quando o objetivo é testar o fluxo de sucesso (201). UUID inexistente é válido apenas para cenários de erro (404, 403).
24. NUNCA hardcodar dados de usuário nos specs — sempre usar `factoryUsuario()` ou `factoryUsuarioAttemptRequests()`. Dados de teste ficam centralizados nas factories.
24. DELETE specs DEVEM usar usuário dedicado (`para_deletar` na factory) — NUNCA deletar o usuário compartilhado dos outros specs.
25. `basePayload` dos specs DEVE vir do `MockDataBuilder` (`buildUsuarioMock('post_usuario').payload`) — NUNCA hardcodar payloads nos specs. Exceção: quando o payload depende de dados dinâmicos do `seed` (ex: `campeonatoId`), usar `payloadResolver`.
26. Cenários de params inválidos (UUID inválido, inexistente) ficam no MESMO spec de permissão via `routeOverride` — NUNCA criar arquivo separado para poucos cenários.
27. Testes de segurança (SQL Injection, XSS, Mass Assignment, Concorrência, Stacktrace) são testes de integração — ficam na pasta `Security/` dentro do módulo, usando a mesma infra Docker/Playwright.
28. Todo cenário DEVE ter campo `descricao` explicando o contexto. Formato no relatório: `[perfil] deve receber [status] quando [descricao]`.
29. Todo spec de permissão DEVE incluir cenários de método HTTP não suportado (ex: GET numa rota que só aceita POST). Status esperado: `HTTP.METHOD_NOT_ALLOWED` (405). Se o backend retorna 404, usar `skip` com motivo.
30. Lógica de seed/setup NUNCA inline no spec — extrair para o SeedBuilder como função nomeada (ex: `seedUsuarioAttemptWithId`, `seedTemporadaAttemptWithCampeonato`). O spec só referencia: `seed: seedTemporadaAttemptWithCampeonato`.
31. Cenários usam tuplas: `[perfil, method, status, descricao, skip?, routeOverride?]` — NUNCA objetos com chaves nomeadas.
32. Ordem das propriedades no `describeAttemptSuite`: config primeiro (`descricao`, `usuarios`, `seed`, `setup`, `routeResolver`, `payloadResolver`), `scenarios` por último.
33. Todos os templates DEVEM validar mensagens não tratadas do framework via `assertSemMensagemNaoTratada()`. A lista de termos fica em `MENSAGENS_NAO_TRATADAS` no `constants.ts`. Se o projeto for em inglês, esvaziar a lista.
34. Teste de concorrência só faz sentido quando a entidade tem unique constraint no banco. Se não tem (ex: Campeonato.nome), NÃO incluir o bloco `concorrencia` no Security spec.
35. NUNCA silenciar falhas reais como sucesso. Se o teste detecta um problema do backend (ex: mensagem em inglês, 500 inesperado), ele DEVE falhar. Se é bug conhecido que não será corrigido agora, usar `skip` com motivo — NUNCA alterar o template ou a lógica de validação para mascarar o problema.
36. NUNCA alterar Templates para contornar falhas. Os templates (`PermissionTemplate`, `InvalidFieldsTemplate`, `SecurityTemplate`) são genéricos e reutilizáveis — se um teste falha por causa do backend, o problema é no backend ou no cenário do spec, NUNCA no template. Se precisar ajustar comportamento para um caso específico, usar `skip` no cenário.
36. CRUD specs testam apenas o caminho feliz e validam simetria com o banco de dados. Cenários de erro (UUID inexistente, campo inválido, permissão negada) pertencem aos AttemptRequests ou InvalidFields — NUNCA no CRUD spec.
37. CRUD specs DEVEM validar persistência no banco após operações de escrita (POST, PATCH, DELETE). Usar funções `selectEntidadeById()` do Database helper para comparar resposta da API com dados no banco.
38. Setup de dependências (ex: Temporada precisa de Campeonato) DEVE ser feito via seed no banco (INSERT direto) — NUNCA via chamada à API dentro do teste. O seed cria os registros, uma função auxiliar busca os IDs.
39. NUNCA usar `test` como setup. Se um caso precisa de dados pré-existentes, isso é responsabilidade do `beforeAll` via seed — não de um "Caso 01 - Setup: criar X".
40. Limpeza é responsabilidade exclusiva do global-teardown. NUNCA fazer cleanup inline nos specs. O teardown deleta por timestamp na ordem inversa de FK.
41. SeedBuilders DEVEM usar `DataBuilder.build()` para obter dados — NUNCA importar factories diretamente (exceto `factoryUsuarioAttemptRequests` que é específico de permissão). O DataBuilder é o orquestrador central de composição.
42. Ao criar um novo módulo, adicionar os cenários no `DataBuilder.ts` ANTES de criar o SeedBuilder. O DataBuilder é a fonte única de composição de dados.

---

## 16. README (tests/Integration/README.md)

Gerar README documentando: arquitetura, setup, comandos, padrão de imports, como adicionar novos testes, convenções, templates, debug, e isolamento TypeScript. Adaptar ao projeto real.

---

## 17. CHECKLIST FINAL

- [ ] `docker/playwright/` — Dockerfile, docker-compose.yml, .env.example, qa, .gitignore (com `.run-counter`)
- [ ] `docker/playwright/qa` — Com histórico de tendência, executor.json e contador
- [ ] `tests/Integration/playwright.config.ts`, `package.json`, `tsconfig.json`
- [ ] `tests/Integration/global-setup.ts`, `global-teardown.ts`
- [ ] `tests/Integration/clean-reporter.js`, `allure-suite-fixer.js` (com labels de Suites + Behaviors)
- [ ] `resources/index.ts` — Barrel file com TODOS os exports
- [ ] `resources/Base/` — test-base, constants, helpers, auth, api, request-logger
- [ ] `resources/Database/` — connection (com SSL), database, [Entidade]Database
- [ ] `resources/Fixtures/DataFactories/` — Uma factory por entidade + RouteFactory
- [ ] `resources/Fixtures/MockDataBuilders/` — Um builder por entidade
- [ ] `resources/Fixtures/SeedBuilders/` — Um por módulo (com ATTEMPT_USUARIOS + seedAttempt)
- [ ] `resources/Routes/` — Uma por entidade (com logRequestResponse)
- [ ] `resources/Seeds/` — Um por entidade
- [ ] `resources/Templates/` — PermissionTemplate + InvalidFieldsTemplate + SecurityTemplate + ResponseEvaluator
- [ ] `specs/Healthcheck/` — Spec mais simples
- [ ] `specs/[Modulo]/[entidade].spec.ts` — CRUD (isolado, com test.step)
- [ ] `specs/[Modulo]/AttemptRequests/[Metodo][Entidade].spec.ts` — Permissão (1 por endpoint)
- [ ] `specs/[Modulo]/AttemptRequests/[Metodo][Entidade]InvalidFields.spec.ts` — Campos inválidos
- [ ] `specs/[Modulo]/Security/[Metodo][Entidade]Security.spec.ts` — Segurança (1 por endpoint)
- [ ] `results/` — Diretório para relatórios (com `.history/` para tendência)
- [ ] `tsconfig.json` do host — Excluir `tests/Integration`
- [ ] `tsconfig.build.json` do host — Excluir `tests`
- [ ] ESLint do host — Ignorar `tests/Integration/**`
- [ ] `.gitignore` do host — Incluir `results/.history/`, `results/.run-counter`
- [ ] `README.md` — Documentação completa

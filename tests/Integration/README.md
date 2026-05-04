# Testes de Integração — Bolão Backend

Testes de integração de API usando **Playwright (TypeScript)** com acesso direto ao banco PostgreSQL (Supabase) para seeding e cleanup. Relatórios via **Allure Report**.

---

## Arquitetura

A estrutura segue um padrão em camadas inspirado em projetos Robot Framework, adaptado para Playwright + TypeScript:

```
tests/Integration/
├── playwright.config.ts          # Configuração do Playwright + Allure
├── package.json                  # Dependências isoladas dos testes
├── tsconfig.json                 # TypeScript isolado (não interfere no backend)
├── global-setup.ts               # Conecta ao banco antes dos testes
├── global-teardown.ts            # Desconecta do banco após os testes
├── resources/
│   ├── index.ts                  # 🔑 Barrel file — centraliza TODOS os exports
│   ├── Base/
│   │   ├── constants.ts          # HTTP status codes, URLs, mensagens de erro
│   │   ├── helpers.ts            # Funções utilitárias
│   │   ├── auth.ts               # Login e geração de headers Bearer
│   │   ├── api.ts                # Queries no banco, helpers de resultado
│   │   └── request-logger.ts     # Anexa request/response ao relatório Allure
│   ├── Database/
│   │   ├── connection.ts         # Pool PostgreSQL (pg) com suporte a SSL (Supabase)
│   │   ├── database.ts           # Schema constants + cleanTestsData()
│   │   ├── UsuarioDatabase.ts    # CRUD direto no banco por entidade
│   │   ├── CampeonatoDatabase.ts
│   │   ├── TemporadaDatabase.ts
│   │   └── GrupoDatabase.ts
│   ├── Fixtures/
│   │   ├── DataBuilder.ts        # Orquestrador central de massa de dados
│   │   ├── DataFactories/        # Fábricas de dados estáticos por entidade
│   │   │   ├── UsuarioFactory.ts
│   │   │   ├── CampeonatoFactory.ts
│   │   │   ├── TemporadaFactory.ts
│   │   │   ├── GrupoFactory.ts
│   │   │   └── RouteFactory.ts   # Catálogo centralizado de rotas da API
│   │   ├── MockDataBuilders/     # Payloads e rotas por endpoint
│   │   │   ├── AuthMockDataBuilder.ts
│   │   │   ├── UsuarioMockDataBuilder.ts
│   │   │   ├── CampeonatoMockDataBuilder.ts
│   │   │   └── GrupoMockDataBuilder.ts
│   │   └── SeedBuilders/         # Composição de seeds por suite
│   │       ├── AuthSuiteSeedBuilder.ts
│   │       ├── UsuarioSuiteSeedBuilder.ts
│   │       ├── CampeonatoSuiteSeedBuilder.ts
│   │       ├── GrupoSuiteSeedBuilder.ts
│   │       └── GrupoAttemptSetup.ts  # Setup compartilhado de grupo para Attempts
│   ├── Routes/                   # Encapsulamento de chamadas HTTP por entidade
│   │   ├── AuthRoute.ts          # (cada rota loga request/response no Allure)
│   │   ├── UsuarioRoute.ts
│   │   ├── CampeonatoRoute.ts
│   │   ├── TemporadaRoute.ts
│   │   ├── GrupoRoute.ts
│   │   └── GrupoUsuarioRoute.ts
│   ├── Seeds/                    # Orquestração de seeding por suite
│   │   ├── AuthSeed.ts
│   │   ├── UsuarioSeed.ts
│   │   ├── CampeonatoSeed.ts
│   │   └── GrupoSeed.ts
│   ├── Templates/                # Templates reutilizáveis
│   │   ├── AttemptRequestsTemplate.ts  # 4 keywords + orquestrador de suite
│   │   └── ResponseEvaluator.ts        # Avaliação inteligente de resposta
│   └── Docs/
│       └── AttemptRequests.ts    # Documentação dos padrões de cenários
└── specs/
    ├── Healthcheck/
    │   └── healthcheck.spec.ts
    ├── Auth/
    │   ├── login.spec.ts
    │   └── AttemptRequests/
    │       ├── PostLogin.spec.ts
    │       ├── PostLogout.spec.ts
    │       └── PostRefresh.spec.ts
    ├── Usuario/
    │   ├── usuario.spec.ts
    │   └── AttemptRequests/
    │       ├── PostUsuario.spec.ts
    │       ├── GetUsuarioMe.spec.ts
    │       └── GetUsuarioById.spec.ts
    ├── Campeonato/
    │   ├── campeonato.spec.ts
    │   └── AttemptRequests/
    │       ├── GetCampeonatos.spec.ts
    │       └── PostCampeonato.spec.ts
    ├── Temporada/
    │   ├── temporada.spec.ts
    │   └── AttemptRequests/
    │       ├── GetTemporadas.spec.ts
    │       └── PostTemporada.spec.ts
    ├── Grupo/
    │   ├── grupo.spec.ts
    │   └── AttemptRequests/
    │       ├── GetGrupos.spec.ts
    │       ├── PatchGrupo.spec.ts
    │       ├── PatchGrupoStatus.spec.ts
    │       ├── DeleteGrupo.spec.ts
    │       ├── GetMembros.spec.ts
    │       └── PostAdicionarMembro.spec.ts
    └── GrupoUsuario/
        └── grupo-usuario.spec.ts
```

---

## Pré-requisitos

- Docker e Docker Compose (v2) instalados
- Backend rodando (`sh dev start-dev`)
- Banco PostgreSQL acessível (Supabase)

---

## Setup

```bash
cd docker/playwright

# Primeira vez — cria .env e builda a imagem
sh qa setup

# Editar o .env com as credenciais do Supabase
vim .env
```

### Variáveis de ambiente (`docker/playwright/.env`)

```env
# Supabase Pooler
DB_HOST=aws-X-XX-XXXX-X.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.SEU_PROJECT_REF
DB_PASS=SUA_SENHA
DB_SSL=true

# URL da API
RESOURCES_URL=http://localhost:3002/
```

> Os dados de conexão são extraídos da `DATABASE_URL` do projeto.
> A senha vai sem URL encoding (a lib `pg` lida direto).

---

## Executando os testes

```bash
cd docker/playwright

sh qa test                    # Executa todos os testes e gera relatório Allure
sh qa test:spec healthcheck   # Executa spec específico e gera relatório
sh qa build                   # Rebuilda a imagem Docker
sh qa setup                   # Setup inicial (cria .env + build)
sh qa server-start            # Inicia Apache para relatórios (localhost:2601)
sh qa server-stop             # Para o Apache
```

Rebuild só é necessário quando muda o `Dockerfile` ou o `package.json`.
Alterações em arquivos `.ts` refletem automaticamente (bind mount).

---

## Relatórios

Todo `sh qa test` gera automaticamente dois relatórios:

- **Allure Report** — dashboard com gráficos, timeline, attachments de request/response → `results/allure-report/index.html`
- **Playwright HTML** — relatório nativo funcional → `results/html/index.html`

Para servir via navegador:

```bash
sh qa server-start
# Acesse: http://localhost:2601
```

Cada teste inclui attachments no Allure com request (método, URL, headers, body) e response (status, body) em formato JSON.

---

## Padrão de imports nos specs

Todo spec usa exatamente estas duas linhas:

```typescript
import { test, expect } from '../../resources';
import * as API from '../../resources';
```

Exemplo:

```typescript
test('Caso 01 - Listar campeonatos', async ({ request }) => {
  const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
  const response = await API.CampeonatoRoute.getCampeonatos(
    request,
    usuario,
  );

  expect(response.status()).toBe(API.HTTP_OK);
});
```

---

## Testes de permissão (AttemptRequests)

Cada endpoint tem um spec dedicado em `AttemptRequests/`, nomeado pelo método HTTP (ex: `PostLogin.spec.ts`, `PatchGrupo.spec.ts`).

Usam o template `registerAttemptSuite` que orquestra: seed → setup → cenários data-driven.

```typescript
import * as API from '../../../resources';
import { registerAttemptSuite } from
  '../../../resources/Templates/AttemptRequestsTemplate';

registerAttemptSuite({
  descricao: 'Attempt PATCH /grupos/:id',
  scenarios: [
    { perfil: 'sem_token', method: 'PATCH', statusEsperado: 401 },
    { perfil: 'admin_grupo', method: 'PATCH', statusEsperado: 200 },
    { perfil: 'membro_grupo', method: 'PATCH', statusEsperado: 403 },
    { perfil: 'user_fora', method: 'PATCH', statusEsperado: 403 },
  ],
  usuarios: USUARIOS,
  seed: async () => { await API.seedingForGrupoSuite(); },
  setup: async (request) => {
    return setupGrupoComMembros(request, admin, membro, 'Attempt');
  },
  routeResolver: (data) => `grupos/${data.grupoId}`,
  payloadResolver: () => ({ nome: `Atualizado ${Date.now()}` }),
});
```

O template cuida de:
- Executar o seed (cria usuários no banco)
- Executar o setup (cria infraestrutura: campeonato → temporada → grupo)
- Iterar os cenários e validar status esperado
- Logar request/response no Allure

---

## Fluxo de cada spec

```
beforeAll  →  Seeding (cria dados no banco via Database helpers)
  test 1   →  Usa Routes para chamar a API + expect nos resultados
  test 2   →  ...
  test N   →  ...
afterAll   →  cleanTestsData (limpa dados criados após executionTime)
```

---

## Como adicionar novos testes

### 1. Nova entidade

```
resources/Database/PalpiteDatabase.ts
resources/Fixtures/DataFactories/PalpiteFactory.ts
resources/Fixtures/MockDataBuilders/PalpiteMockDataBuilder.ts
resources/Fixtures/SeedBuilders/PalpiteSuiteSeedBuilder.ts
resources/Routes/PalpiteRoute.ts
resources/Seeds/PalpiteSeed.ts
specs/Palpite/palpite.spec.ts
specs/Palpite/AttemptRequests/PostPalpite.spec.ts   # 1 arquivo por endpoint
specs/Palpite/AttemptRequests/GetPalpite.spec.ts
```

### 2. Atualizar o barrel file

Sempre adicionar o export em `resources/index.ts`.

### 3. Adicionar tabela no cleanup

Em `resources/Database/database.ts`, adicionar no `SCHEMA` e no `cleanTestsData` (respeitando ordem de FK).

---

## Convenções

| Padrão | Exemplo |
|---|---|
| Factory | `factoryUsuario('adm_to_manage_auth_suite')` |
| MockDataBuilder | `buildAuthMock('post_login')` |
| Seed | `seedingForAuthSuite()` |
| Route | `AuthRoute.postLogin(request, payload)` |
| Database | `UsuarioDB.selectUsuarioByEmail(email)` |
| Cleanup | `cleanTestsData(executionTime)` |
| AttemptRequest spec | `PostLogin.spec.ts` (1 arquivo = 1 endpoint) |

---

## Templates (equivalência Robot → Playwright)

| Robot Keyword | Playwright Function |
|---|---|
| `Attempt Requests` | `attemptRequest()` |
| `Attempt Requests For Rules Test` | `attemptRequestForRules()` |
| `Attempt Requests For Rules Authorized Test` | `attemptRequestForRulesAuthorized()` |
| `Attempt Requests With Invalid Values` | `attemptWithInvalidField()` |
| `Evaluate Response Behavior` | `evaluateResponseBehavior()` |
| `Evaluate Response For Rules Authorized` | `evaluateResponseForRulesAuthorized()` |
| Suite orquestrada (beforeAll + cenários) | `registerAttemptSuite()` |

---

## Debug

```bash
# Trace completo
npx playwright test --trace on

# Output verboso
npx playwright test --reporter=list

# Spec específico em modo debug
npx playwright test specs/Auth/login.spec.ts --debug
```

---

## Isolamento do TypeScript

A pasta `tests/Integration/` tem `tsconfig.json` e `package.json` próprios. O projeto host exclui essa pasta:

```jsonc
// tsconfig.json do host
{ "exclude": ["node_modules", "dist", "tests/Integration"] }

// tsconfig.build.json do host
{ "exclude": ["node_modules", "test", "tests", "dist", "**/*spec.ts"] }
```

Dependências dos testes são instaladas **apenas no Docker** (`npm install` no Dockerfile).

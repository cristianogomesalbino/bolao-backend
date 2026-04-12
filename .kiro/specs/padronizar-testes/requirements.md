# Documento de Requisitos

## Introdução

Migração completa do framework de testes do projeto de Jest para Vitest 4, substituindo o padrão de instanciação via `TestingModule` do NestJS por instanciação direta com mocks manuais (`vi.fn()`). O objetivo é alinhar todos os testes existentes com as convenções definidas no steering do projeto, simplificando a configuração e execução dos testes unitários.

## Glossário

- **Vitest**: Framework de testes unitários compatível com Vite, substituto do Jest neste projeto
- **TestingModule**: Módulo do pacote `@nestjs/testing` que cria um container de injeção de dependência para testes — será removido
- **Instanciação_Direta**: Padrão de teste onde services e controllers são instanciados com `new` e recebem mocks via construtor, sem uso de `TestingModule`
- **Mock_Manual**: Objeto criado com `vi.fn()` que simula dependências nos testes
- **Arquivo_de_Teste**: Arquivo `.spec.ts` contendo testes unitários de um service, controller ou utilitário
- **Configuração_Vitest**: Arquivo `vitest.config.ts` na raiz do projeto que define as opções do Vitest
- **Cobertura_de_Código**: Métrica que indica o percentual de código exercitado pelos testes
- **Script_de_Teste**: Comando definido no `package.json` para executar testes (`test`, `test:cov`, `test:watch`)

## Requisitos

### Requisito 1: Configurar Vitest como framework de testes

**User Story:** Como desenvolvedor, eu quero que o Vitest 4 esteja configurado como framework de testes do projeto, para que os testes executem com o framework definido no steering.

#### Critérios de Aceitação

1. THE Configuração_Vitest SHALL definir o ambiente de teste como `node`, o diretório raiz como `src`, e o padrão de arquivos de teste como `.*\\.spec\\.ts$`
2. THE Configuração_Vitest SHALL configurar resolução de paths compatível com os aliases do `tsconfig.json` do projeto (ex: `src/*` → `./src/*`)
3. THE Configuração_Vitest SHALL configurar o provider de cobertura como `v8` com diretório de saída `coverage`
4. WHEN o comando `vitest run` for executado, THE Vitest SHALL localizar e executar todos os Arquivos_de_Teste do projeto com sucesso
5. THE Configuração_Vitest SHALL configurar `transformMode` ou equivalente para suportar módulos ESM como `nanoid`

### Requisito 2: Atualizar scripts e dependências do projeto

**User Story:** Como desenvolvedor, eu quero que os scripts de teste no `package.json` usem Vitest e que as dependências do Jest sejam removidas, para que o projeto tenha uma única ferramenta de testes.

#### Critérios de Aceitação

1. THE Script_de_Teste `test` SHALL executar `vitest run` para execução única dos testes
2. THE Script_de_Teste `test:watch` SHALL executar `vitest` em modo watch
3. THE Script_de_Teste `test:cov` SHALL executar `vitest run --coverage` para gerar relatório de cobertura
4. WHEN as dependências forem atualizadas, THE `package.json` SHALL incluir `vitest` e `@vitest/coverage-v8` como devDependencies
5. WHEN as dependências forem atualizadas, THE `package.json` SHALL remover `jest`, `ts-jest`, `@types/jest` das devDependencies
6. WHEN as dependências forem atualizadas, THE `package.json` SHALL remover a seção de configuração `jest` do `package.json`
7. THE Script_de_Teste `test:e2e` SHALL ser removido ou atualizado para usar Vitest

### Requisito 3: Migrar sintaxe de mocks de Jest para Vitest

**User Story:** Como desenvolvedor, eu quero que todos os arquivos de teste usem a API de mocks do Vitest, para que o código de teste seja consistente com o framework adotado.

#### Critérios de Aceitação

1. WHEN um Arquivo_de_Teste contiver `jest.fn()`, THE Arquivo_de_Teste SHALL substituir por `vi.fn()`
2. WHEN um Arquivo_de_Teste contiver `jest.mock()`, THE Arquivo_de_Teste SHALL substituir por `vi.mock()`
3. WHEN um Arquivo_de_Teste contiver `jest.spyOn()`, THE Arquivo_de_Teste SHALL substituir por `vi.spyOn()`
4. WHEN um Arquivo_de_Teste contiver `jest.clearAllMocks()`, THE Arquivo_de_Teste SHALL substituir por `vi.clearAllMocks()`
5. WHEN um Arquivo_de_Teste contiver type casts `as jest.Mock`, THE Arquivo_de_Teste SHALL substituir por `as any` ou usar tipagem adequada do Vitest (`Mock`)
6. WHEN um Arquivo_de_Teste contiver `jest.fn((cb) => cb(mock))` para simular `$transaction`, THE Arquivo_de_Teste SHALL substituir por `vi.fn((cb) => cb(mock))`
7. THE Arquivo_de_Teste SHALL importar `vi` e `describe`, `it`, `expect`, `beforeEach`, `beforeAll` de `vitest` quando necessário (Vitest injeta globais por padrão, mas imports explícitos são aceitos)

### Requisito 4: Substituir TestingModule por instanciação direta

**User Story:** Como desenvolvedor, eu quero que todos os testes instanciem services e controllers diretamente via construtor com mocks, para que os testes sejam mais simples, rápidos e alinhados com o steering do projeto.

#### Critérios de Aceitação

1. WHEN um Arquivo_de_Teste usar `Test.createTestingModule()` para instanciar um service, THE Arquivo_de_Teste SHALL substituir por instanciação direta via `new ServiceClass(mockDependencia)` passando mocks como parâmetros do construtor
2. WHEN um Arquivo_de_Teste usar `Test.createTestingModule()` para instanciar um controller, THE Arquivo_de_Teste SHALL substituir por instanciação direta via `new ControllerClass(mockService)`
3. WHEN um Arquivo_de_Teste usar `module.get<T>()` para obter instâncias, THE Arquivo_de_Teste SHALL remover essa chamada e usar a variável criada pela instanciação direta
4. WHEN um Arquivo_de_Teste importar `Test` ou `TestingModule` de `@nestjs/testing`, THE Arquivo_de_Teste SHALL remover esses imports
5. THE Arquivo_de_Teste SHALL manter o padrão de limpar mocks no `beforeEach` usando `vi.clearAllMocks()`

### Requisito 5: Migrar o arquivo auth.service.spec.ts

**User Story:** Como desenvolvedor, eu quero que o teste do AuthService seja migrado para instanciação direta, para que siga o mesmo padrão dos demais testes.

#### Critérios de Aceitação

1. WHEN o auth.service.spec.ts for migrado, THE Arquivo_de_Teste SHALL substituir o padrão `Object.create(AuthService.prototype)` com atribuição manual de propriedades por instanciação direta via construtor `new AuthService(mockPrisma, mockJwt)`
2. WHEN o auth.service.spec.ts for migrado, THE Arquivo_de_Teste SHALL substituir `jest.mock('bcryptjs')` por `vi.mock('bcryptjs')`
3. WHEN o auth.service.spec.ts for migrado, THE Arquivo_de_Teste SHALL remover o `jest.mock()` do `ErrorFactory` e usar a implementação real, validando as exceções lançadas pelo tipo correto
4. WHEN o auth.service.spec.ts for migrado, THE Arquivo_de_Teste SHALL remover o `require()` dinâmico do `beforeAll` e usar import estático do `AuthService`

### Requisito 6: Preservar cobertura de cenários de teste

**User Story:** Como desenvolvedor, eu quero que todos os cenários de teste existentes continuem cobertos após a migração, para que a qualidade do projeto seja mantida.

#### Critérios de Aceitação

1. THE Vitest SHALL executar todos os Arquivos_de_Teste migrados com resultado de sucesso (zero falhas)
2. WHEN um Arquivo_de_Teste for migrado, THE Arquivo_de_Teste SHALL manter todos os blocos `describe` e `it` existentes com a mesma lógica de verificação
3. WHEN um Arquivo_de_Teste for migrado, THE Arquivo_de_Teste SHALL manter as mesmas asserções (`expect`) com os mesmos valores esperados
4. IF um teste `it('should be defined')` existir apenas para validar a criação via `TestingModule`, THEN THE Arquivo_de_Teste SHALL remover esse teste por ser redundante com instanciação direta
5. THE Cobertura_de_Código gerada pelo Vitest SHALL cobrir os mesmos caminhos de código que a cobertura anterior com Jest

### Requisito 7: Remover artefatos do Jest

**User Story:** Como desenvolvedor, eu quero que todos os artefatos e configurações do Jest sejam removidos do projeto, para que não haja configuração residual de um framework não utilizado.

#### Critérios de Aceitação

1. WHEN a migração for concluída, THE `package.json` SHALL conter zero referências a `jest` em scripts, dependências ou configuração
2. IF existir um arquivo `jest.config.js` ou `jest.config.ts` na raiz do projeto, THEN THE projeto SHALL remover esse arquivo
3. IF existir um arquivo `test/jest-e2e.json`, THEN THE projeto SHALL remover esse arquivo
4. WHEN a migração for concluída, THE projeto SHALL conter zero imports de `@nestjs/testing` em Arquivos_de_Teste (o pacote pode permanecer como dependência para uso futuro em testes e2e)
5. WHEN a migração for concluída, THE projeto SHALL conter zero referências a `jest.fn`, `jest.mock`, `jest.spyOn` ou `jest.clearAllMocks` em Arquivos_de_Teste

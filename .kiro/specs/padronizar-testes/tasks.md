# Plano de Implementação: Padronizar Testes (Jest → Vitest)

## Visão Geral

Migração incremental do framework de testes de Jest para Vitest 4, substituindo `TestingModule` por instanciação direta com mocks manuais. Cada etapa é validável independentemente — configuração primeiro, depois migração arquivo a arquivo, e por fim limpeza de artefatos.

## Tarefas

- [x] 1. Configurar Vitest e atualizar dependências do projeto
  - [x] 1.1 Criar `vitest.config.ts` na raiz do projeto
    - Definir `environment: 'node'`, `root: 'src'`, `include: ['**/*.spec.ts']`
    - Configurar alias `src` → `path.resolve(__dirname, 'src')` para compatibilidade com `tsconfig.json`
    - Configurar cobertura com `provider: 'v8'` e `reportsDirectory: '../coverage'`
    - _Requisitos: 1.1, 1.2, 1.3, 1.5_

  - [x] 1.2 Atualizar `package.json` — scripts e dependências
    - Alterar script `test` para `vitest run`
    - Alterar script `test:watch` para `vitest`
    - Alterar script `test:cov` para `vitest run --coverage`
    - Remover ou atualizar script `test:e2e` para usar Vitest
    - Adicionar `vitest` e `@vitest/coverage-v8` em devDependencies
    - Remover `jest`, `ts-jest`, `@types/jest` de devDependencies
    - Remover seção de configuração `jest` do `package.json`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 2. Migrar mock compartilhado e arquivos com instanciação direta (apenas sintaxe)
  - [x] 2.1 Migrar `test/mocks/prisma.mock.ts`
    - Substituir `jest.fn()` por `vi.fn()`
    - Adicionar `import { vi } from 'vitest'`
    - _Requisitos: 3.1_

  - [x] 2.2 Migrar `auth.controller.spec.ts` (já usa instanciação direta)
    - Substituir `jest.fn()` → `vi.fn()`, `jest.clearAllMocks()` → `vi.clearAllMocks()`
    - Substituir `as jest.Mock` → `as any`
    - Adicionar imports de `vitest` (`describe`, `it`, `expect`, `beforeEach`, `vi`)
    - Remover testes `should be defined` se existirem
    - _Requisitos: 3.1, 3.4, 3.5, 3.7, 6.2, 6.3, 6.4_

  - [x] 2.3 Migrar `self-or-admin.guard.spec.ts` (já usa instanciação direta)
    - Substituir sintaxe Jest → Vitest (mesmas substituições de 2.2)
    - _Requisitos: 3.1, 3.4, 3.5, 3.7, 6.2, 6.3_

  - [x] 2.4 Migrar `parse-uuid-custom.pipe.spec.ts` (já usa instanciação direta)
    - Substituir sintaxe Jest → Vitest
    - _Requisitos: 3.1, 3.4, 3.5, 3.7, 6.2, 6.3_

  - [x] 2.5 Migrar `error.factory.spec.ts` (já usa instanciação direta)
    - Substituir sintaxe Jest → Vitest
    - _Requisitos: 3.1, 3.4, 3.5, 3.7, 6.2, 6.3_

  - [x] 2.6 Migrar `prisma-exception.filter.spec.ts` (já usa instanciação direta)
    - Substituir sintaxe Jest → Vitest
    - _Requisitos: 3.1, 3.4, 3.5, 3.7, 6.2, 6.3_

- [x] 3. Checkpoint — Validar arquivos com instanciação direta
  - Executar `vitest run` e garantir que os testes migrados na etapa 2 passam
  - Garantir que todos os testes passam, perguntar ao usuário se surgirem dúvidas

- [x] 4. Migrar services com TestingModule para instanciação direta
  - [x] 4.1 Migrar `campeonatos.service.spec.ts`
    - Remover imports de `@nestjs/testing` (`Test`, `TestingModule`)
    - Substituir `Test.createTestingModule()` por `new CampeonatosService(mockPrisma as any)`
    - Remover `module.get<T>()`
    - Substituir `jest.fn()` → `vi.fn()`, `jest.clearAllMocks()` → `vi.clearAllMocks()`
    - Adicionar imports de `vitest`
    - Remover testes `should be defined`
    - Manter todos os blocos `describe`/`it` e asserções existentes
    - _Requisitos: 3.1, 3.4, 3.7, 4.1, 4.3, 4.4, 4.5, 6.2, 6.3, 6.4_

  - [x] 4.2 Migrar `temporadas.service.spec.ts`
    - Mesmas substituições de 4.1 — `new TemporadasService(mockPrisma as any)`
    - _Requisitos: 3.1, 3.4, 3.7, 4.1, 4.3, 4.4, 4.5, 6.2, 6.3, 6.4_

  - [x] 4.3 Migrar `usuarios.service.spec.ts`
    - Mesmas substituições de 4.1 — `new UsuariosService(mockPrisma as any)`
    - _Requisitos: 3.1, 3.4, 3.7, 4.1, 4.3, 4.4, 4.5, 6.2, 6.3, 6.4_

  - [x] 4.4 Migrar `grupos.service.spec.ts`
    - Mesmas substituições de 4.1 — `new GruposService(mockPrisma as any)`
    - Garantir que mock de `$transaction` usa `vi.fn((cb) => cb(mockTx))`
    - _Requisitos: 3.1, 3.4, 3.6, 3.7, 4.1, 4.3, 4.4, 4.5, 6.2, 6.3, 6.4_

  - [x] 4.5 Migrar `grupo-usuario.service.spec.ts`
    - Mesmas substituições de 4.1 — `new GrupoUsuarioService(mockPrisma as any)`
    - Garantir que mock de `$transaction` usa `vi.fn((cb) => cb(mockTx))`
    - _Requisitos: 3.1, 3.4, 3.6, 3.7, 4.1, 4.3, 4.4, 4.5, 6.2, 6.3, 6.4_

- [x] 5. Migrar controllers e guard com TestingModule
  - [x] 5.1 Migrar `campeonatos.controller.spec.ts`
    - Substituir `TestingModule` por `new CampeonatosController(mockService as any)`
    - Remover imports de `@nestjs/testing`
    - Substituir sintaxe Jest → Vitest
    - Remover teste `should be defined` (redundante)
    - _Requisitos: 3.1, 3.7, 4.2, 4.3, 4.4, 6.4_

  - [x] 5.2 Migrar `temporadas.controller.spec.ts`
    - Substituir `TestingModule` por `new TemporadasController(mockService as any)`
    - Mesmas substituições de 5.1
    - _Requisitos: 3.1, 3.7, 4.2, 4.3, 4.4, 6.4_

  - [x] 5.3 Migrar `grupos.controller.spec.ts`
    - Substituir `TestingModule` por `new GruposController(mockService as any)`
    - Mesmas substituições de 5.1
    - _Requisitos: 3.1, 3.7, 4.2, 4.3, 4.4, 6.4_

  - [x] 5.4 Migrar `app.controller.spec.ts`
    - Substituir `TestingModule` por `new AppController(mockService as any)`
    - Mesmas substituições de 5.1
    - _Requisitos: 3.1, 3.7, 4.2, 4.3, 4.4, 6.4_

  - [x] 5.5 Migrar `group-role.guard.spec.ts`
    - Substituir `TestingModule` por `new GroupRoleGuard(mockReflector as any, mockPrisma as any)`
    - Remover imports de `@nestjs/testing`
    - Substituir sintaxe Jest → Vitest
    - Manter todos os cenários de teste existentes
    - _Requisitos: 3.1, 3.7, 4.1, 4.3, 4.4, 4.5, 6.2, 6.3_

- [x] 6. Checkpoint — Validar services, controllers e guard migrados
  - Executar `vitest run` e garantir que todos os testes das etapas 4 e 5 passam
  - Garantir que todos os testes passam, perguntar ao usuário se surgirem dúvidas

- [x] 7. Migrar auth.service.spec.ts (caso especial)
  - [x] 7.1 Migrar `auth.service.spec.ts`
    - Remover `jest.mock('../../common/errors/error.factory')` — usar implementação real do `ErrorFactory`
    - Substituir `jest.mock('bcryptjs')` por `vi.mock('bcryptjs')`
    - Remover `require()` dinâmico e `beforeAll` — usar import estático do `AuthService`
    - Remover `Object.create(AuthService.prototype)` — usar `new AuthService(mockPrisma as any, mockJwt as any)`
    - Substituir `(bcrypt.compare as jest.Mock)` por `(bcrypt.compare as any)`
    - Atualizar asserções para validar exceções pelo tipo correto (`UnauthorizedException`, `NotFoundException`, etc.)
    - Adicionar imports de `vitest`
    - Manter todos os cenários de teste existentes
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 3.1, 3.2, 3.5, 6.2, 6.3_

- [x] 8. Migrar teste e2e (apenas sintaxe)
  - [x] 8.1 Migrar `test/app.e2e-spec.ts`
    - Substituir sintaxe Jest → Vitest (`jest.fn` → `vi.fn`, etc.)
    - Manter `TestingModule` e `AppModule` real (é teste e2e legítimo)
    - Adicionar imports de `vitest`
    - _Requisitos: 3.1, 3.4, 3.7, 6.2, 6.3_

- [x] 9. Remover artefatos do Jest
  - [x] 9.1 Remover arquivos de configuração do Jest
    - Remover `jest.config.js` ou `jest.config.ts` se existir na raiz
    - Remover `test/jest-e2e.json` se existir
    - _Requisitos: 7.2, 7.3_

  - [x] 9.2 Validar ausência completa de referências ao Jest
    - Verificar que `package.json` não contém referências a `jest` em scripts, dependências ou configuração
    - Verificar que nenhum `.spec.ts` contém `jest.fn`, `jest.mock`, `jest.spyOn`, `jest.clearAllMocks` ou `as jest.Mock`
    - Verificar que nenhum `.spec.ts` em `src/` importa `@nestjs/testing`
    - _Requisitos: 7.1, 7.4, 7.5_

- [x] 10. Checkpoint final — Validar migração completa
  - Executar `vitest run` e garantir que todos os testes passam com zero falhas
  - Garantir que todos os testes passam, perguntar ao usuário se surgirem dúvidas
  - _Requisitos: 1.4, 6.1_

- [ ] 11. Testes de propriedade
  - [ ]* 11.1 Escrever teste de propriedade — Ausência de APIs do Jest
    - **Propriedade 1: Ausência de APIs do Jest em arquivos de teste**
    - Para cada arquivo `.spec.ts`, verificar que não contém `jest.fn`, `jest.mock`, `jest.spyOn`, `jest.clearAllMocks` ou `as jest.Mock`
    - **Valida: Requisitos 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.2, 7.5**

  - [ ]* 11.2 Escrever teste de propriedade — Ausência de @nestjs/testing em unitários
    - **Propriedade 2: Ausência de imports do @nestjs/testing em testes unitários**
    - Para cada arquivo `.spec.ts` em `src/`, verificar que não contém imports de `@nestjs/testing`
    - Excluir `test/app.e2e-spec.ts` da verificação
    - **Valida: Requisitos 4.1, 4.2, 4.3, 4.4, 7.4**

  - [ ]* 11.3 Escrever teste de propriedade — Ausência de should be defined
    - **Propriedade 3: Ausência de testes redundantes `should be defined`**
    - Para cada arquivo `.spec.ts`, verificar que não contém `it('should be defined'` com apenas `expect(x).toBeDefined()`
    - **Valida: Requisito 6.4**

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- O arquivo `test/app.e2e-spec.ts` mantém `TestingModule` por ser teste e2e legítimo
- Testes de propriedade usam `fast-check` conforme definido no design

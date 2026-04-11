# Feature: Padronizar Testes (Jest → Vitest + Instanciação Direta)

## Problema

Os testes atuais usam Jest com `TestingModule` do NestJS. O steering do projeto define Vitest 4 com instanciação direta como padrão. A migração alinha o projeto com as convenções e simplifica os testes.

## Objetivo

Migrar todos os testes de Jest para Vitest 4 e substituir `TestingModule` por instanciação direta dos services/controllers com mocks manuais.

## Requisitos

### Requisito 1: Configurar Vitest
- Instalar `vitest` e configurar `vitest.config.ts`
- Remover dependências do Jest (`@nestjs/testing` nos testes, `jest` config)
- Atualizar scripts no `package.json` (`test`, `test:cov`, `test:watch`)

### Requisito 2: Migrar sintaxe dos testes
- Substituir `jest.fn()` por `vi.fn()`
- Substituir `jest.mock()` por `vi.mock()`
- Substituir `jest.spyOn()` por `vi.spyOn()`
- Manter `describe`, `it`, `expect` (compatíveis)

### Requisito 3: Instanciação direta
- Remover uso de `Test.createTestingModule()` em todos os specs
- Instanciar services diretamente: `new UsuariosService(mockPrisma)`
- Instanciar controllers diretamente: `new UsuariosController(mockService)`

### Requisito 4: Manter cobertura
- Todos os cenários de teste existentes devem continuar cobertos
- Nenhum teste deve ser removido sem substituição equivalente

## Arquivos a migrar

- `src/app.controller.spec.ts`
- `src/modules/usuarios/usuarios.service.spec.ts`
- `src/modules/campeonatos/campeonatos.service.spec.ts`
- `src/modules/temporadas/temporadas.service.spec.ts`
- `src/modules/grupos/grupos.service.spec.ts`
- `src/modules/grupo-usuario/grupo-usuario.service.spec.ts`
- `src/modules/auth/auth.service.spec.ts`
- `src/common/errors/error.factory.spec.ts`

## Tarefas

- [ ] Instalar vitest e @vitest/coverage-v8
- [ ] Criar vitest.config.ts
- [ ] Atualizar scripts de teste no package.json
- [ ] Remover configuração Jest do package.json/jest.config
- [ ] Migrar app.controller.spec.ts
- [ ] Migrar usuarios.service.spec.ts
- [ ] Migrar campeonatos.service.spec.ts
- [ ] Migrar temporadas.service.spec.ts
- [ ] Migrar grupos.service.spec.ts
- [ ] Migrar grupo-usuario.service.spec.ts
- [ ] Migrar auth.service.spec.ts
- [ ] Migrar error.factory.spec.ts
- [ ] Rodar todos os testes e garantir que passam
- [ ] Verificar cobertura de código

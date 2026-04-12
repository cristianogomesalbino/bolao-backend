# Plano de Implementação: Extrair Constantes por Módulo

## Visão Geral

Refatoração para centralizar strings hardcoded em arquivos de constantes por módulo e um arquivo global de roles. Abordagem incremental: criar constantes primeiro, depois substituir referências módulo a módulo.

## Tarefas

- [x] 1. Criar constantes globais de roles
  - [x] 1.1 Criar `src/common/constants/roles.constants.ts` exportando `PERFIL` (`SUPER_ADMIN`, `USER`) e `GRUPO_ROLE` (`ADMIN`, `MEMBER`) como objetos `as const`
    - _Requisitos: 2.1_

- [x] 2. Criar arquivos de constantes por módulo e substituir strings
  - [x] 2.1 Criar `src/modules/auth/auth.constants.ts` com TAG e MENSAGENS (credenciais, refresh, logout, guards)
    - Incluir mensagens do auth.service, group-role.guard e self-or-admin.guard
    - _Requisitos: 1.1, 1.2, 1.3_
  - [x] 2.2 Substituir strings hardcoded em `auth.controller.ts`, `auth.service.ts`, `group-role.guard.ts` e `self-or-admin.guard.ts` pelas constantes de AUTH e roles globais
    - `@ApiTags()` → `AUTH.TAG`
    - `ErrorFactory.*('...')` → `AUTH.MENSAGENS.*`
    - `'SUPER_ADMIN'` → `PERFIL.SUPER_ADMIN` no self-or-admin.guard
    - `@GroupRoles('ADMIN')` permanece string (decorator de metadata)
    - _Requisitos: 3.1, 4.1, 4.2, 4.3, 4.4_
  - [x] 2.3 Criar `src/modules/usuarios/usuarios.constants.ts` com TAG e MENSAGENS
    - _Requisitos: 1.1, 1.2, 1.3_
  - [x] 2.4 Substituir strings hardcoded em `usuarios.controller.ts` e `usuarios.service.ts` pelas constantes
    - _Requisitos: 3.1, 4.1, 4.2_
  - [x] 2.5 Criar `src/modules/campeonatos/campeonatos.constants.ts` com TAG (sem mensagens)
    - _Requisitos: 1.1, 1.2_
  - [x] 2.6 Substituir `@ApiTags()` em `campeonatos.controller.ts` pela constante
    - _Requisitos: 3.1_
  - [x] 2.7 Criar `src/modules/temporadas/temporadas.constants.ts` com TAG e MENSAGENS
    - _Requisitos: 1.1, 1.2, 1.3_
  - [x] 2.8 Substituir strings hardcoded em `temporadas.controller.ts` e `temporadas.service.ts` pelas constantes
    - _Requisitos: 3.1, 4.1_
  - [x] 2.9 Criar `src/modules/grupos/grupos.constants.ts` com TAG e MENSAGENS
    - _Requisitos: 1.1, 1.2, 1.3_
  - [x] 2.10 Substituir strings hardcoded em `grupos.controller.ts` e `grupos.service.ts` pelas constantes de GRUPOS e roles globais
    - `'ADMIN'` no service → `GRUPO_ROLE.ADMIN`
    - `@GroupRoles('ADMIN')` no controller → `@GroupRoles(GRUPO_ROLE.ADMIN)`
    - _Requisitos: 3.1, 3.2, 4.1, 4.2, 4.3_
  - [x] 2.11 Criar `src/modules/grupo-usuario/grupo-usuario.constants.ts` com TAG e MENSAGENS
    - _Requisitos: 1.1, 1.2, 1.3_
  - [x] 2.12 Substituir strings hardcoded em `grupo-usuario.controller.ts` e `grupo-usuario.service.ts` pelas constantes e roles globais
    - Migrar `ROLE_ADMIN`/`ROLE_MEMBER` locais para `GRUPO_ROLE.ADMIN`/`GRUPO_ROLE.MEMBER`
    - _Requisitos: 3.1, 3.2, 4.1, 4.2, 4.3_

- [x] 3. Checkpoint — Verificar regressão
  - Rodar `sh dev npx vitest run` e garantir que todos os testes existentes passam sem alteração
  - Ensure all tests pass, ask the user if questions arise.
  - _Requisitos: 5.1, 5.2_

- [ ] 4. Testes de propriedades
  - [ ]* 4.1 Escrever teste de propriedade: ausência de strings hardcoded em ErrorFactory, @ApiTags e retornos de mensagem
    - **Propriedade 1: Ausência de strings hardcoded em chamadas ErrorFactory, @ApiTags e retornos de mensagem**
    - **Valida: Requisitos 1.3, 3.1, 4.1, 4.2, 4.4**
  - [ ]* 4.2 Escrever teste de propriedade: ausência de strings literais de role em guards, services e controllers
    - **Propriedade 2: Ausência de strings literais de role em guards, services e controllers**
    - **Valida: Requisitos 2.2, 3.2, 4.3**
  - [ ]* 4.3 Escrever teste de propriedade: preservação dos valores originais nas constantes
    - **Propriedade 3: Preservação dos valores originais nas constantes**
    - **Valida: Requisito 5.1**

- [x] 5. Checkpoint final
  - Rodar `sh dev npx vitest run` e garantir que todos os testes (existentes + novos) passam
  - Ensure all tests pass, ask the user if questions arise.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- A refatoração não altera nenhum valor de string — apenas move para constantes

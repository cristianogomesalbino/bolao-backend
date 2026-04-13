# Plano de Implementação: Domain Errors

## Visão Geral

Criar hierarquia de erros de domínio (`DomainError` → 15 subclasses), registrar `DomainExceptionFilter` global, migrar 5 services e atualizar testes existentes. Implementação incremental: base → classes → filter → registro → migração por módulo → testes.

## Tarefas

- [x] 1. Criar classe base DomainError e classes de erro específicas
  - [x] 1.1 Criar classe abstrata `DomainError` em `src/common/errors/domain-error.ts`
    - Estender `Error` com propriedades `mensagem` (string) e `statusCode` (number abstrato)
    - Definir `name` como `this.constructor.name` no constructor
    - _Requisitos: 1.1, 1.2, 1.3_

  - [x] 1.2 Criar classes de erro do módulo Auth em `src/common/errors/domain-errors/auth.errors.ts`
    - `CredenciaisInvalidasError` (401), `RefreshNaoFornecidoError` (401), `RefreshInvalidoError` (401), `RefreshExpiradoError` (401)
    - Mensagem padrão via constantes `AUTH.MENSAGENS`
    - _Requisitos: 2.1, 2.6, 2.7_

  - [x] 1.3 Criar classes de erro do módulo Usuarios em `src/common/errors/domain-errors/usuarios.errors.ts`
    - `UsuarioNaoEncontradoError` (404), `EmailJaCadastradoError` (409)
    - Mensagem padrão via constantes `USUARIOS.MENSAGENS`
    - _Requisitos: 2.2, 2.6, 2.7_

  - [x] 1.4 Criar classes de erro do módulo Temporadas em `src/common/errors/domain-errors/temporadas.errors.ts`
    - `CampeonatoNaoEncontradoError` (404)
    - Mensagem padrão via constantes `TEMPORADAS.MENSAGENS`
    - _Requisitos: 2.3, 2.6, 2.7_

  - [x] 1.5 Criar classes de erro do módulo Grupos em `src/common/errors/domain-errors/grupos.errors.ts`
    - `TemporadaNaoEncontradaError` (404), `GrupoNaoEncontradoError` (404), `DesativeAntesDeExcluirError` (400)
    - Mensagem padrão via constantes `GRUPOS.MENSAGENS`
    - _Requisitos: 2.4, 2.6, 2.7_

  - [x] 1.6 Criar classes de erro do módulo GrupoUsuario em `src/common/errors/domain-errors/grupo-usuario.errors.ts`
    - `CodigoConviteInvalidoError` (404), `GrupoInativoError` (400), `JaEstaNoGrupoError` (409), `LimiteParticipantesError` (400), `UnicoAdminError` (400)
    - Mensagem padrão via constantes `GRUPO_USUARIO.MENSAGENS`
    - _Requisitos: 2.5, 2.6, 2.7_

  - [x] 1.7 Criar barrel export em `src/common/errors/domain-errors/index.ts`
    - Exportar todas as classes de todos os arquivos de erro
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Criar DomainExceptionFilter e registrar no AppModule
  - [x] 2.1 Criar `DomainExceptionFilter` em `src/common/filters/domain-exception.filter.ts`
    - Usar `@Catch(DomainError)` para capturar apenas erros de domínio
    - Retornar resposta no formato `{ erros: [{ mensagens: [mensagem] }] }` com `statusCode` do erro
    - _Requisitos: 3.2, 3.3_

  - [x] 2.2 Registrar `DomainExceptionFilter` como `APP_FILTER` no `AppModule`
    - Registrar antes dos outros filters para garantir prioridade correta
    - _Requisitos: 3.1_

- [x] 3. Checkpoint — Verificar estrutura base
  - Garantir que todas as classes de erro compilam e o filter está registrado. Rodar `sh dev npx vitest run` para verificar que testes existentes continuam passando. Perguntar ao usuário se há dúvidas.

- [x] 4. Migrar AuthService para domain errors
  - [x] 4.1 Substituir `ErrorFactory` por domain errors no `AuthService`
    - `ErrorFactory.unauthorized(CREDENCIAIS_INVALIDAS)` → `new CredenciaisInvalidasError()`
    - `ErrorFactory.unauthorized(REFRESH_NAO_FORNECIDO)` → `new RefreshNaoFornecidoError()`
    - `ErrorFactory.unauthorized(REFRESH_INVALIDO)` → `new RefreshInvalidoError()`
    - `ErrorFactory.unauthorized(REFRESH_EXPIRADO)` → `new RefreshExpiradoError()`
    - _Requisitos: 4.1, 4.2_

  - [x] 4.2 Atualizar testes do `AuthService` para verificar classes de erro específicas
    - Trocar `toThrow(HttpException)` / verificação de mensagem por `toThrow(CredenciaisInvalidasError)`, etc.
    - _Requisitos: 6.1, 6.2_

- [x] 5. Migrar UsuariosService para domain errors
  - [x] 5.1 Substituir `ErrorFactory` por domain errors no `UsuariosService`
    - `ErrorFactory.conflict(EMAIL_JA_CADASTRADO)` → `new EmailJaCadastradoError()`
    - `ErrorFactory.notFound(USUARIO_NAO_ENCONTRADO)` → `new UsuarioNaoEncontradoError()`
    - _Requisitos: 4.3, 4.4_

  - [x] 5.2 Atualizar testes do `UsuariosService` para verificar classes de erro específicas
    - _Requisitos: 6.1, 6.2_

- [x] 6. Migrar TemporadasService para domain errors
  - [x] 6.1 Substituir `ErrorFactory` por domain errors no `TemporadasService`
    - `ErrorFactory.notFound(CAMPEONATO_NAO_ENCONTRADO)` → `new CampeonatoNaoEncontradoError()`
    - _Requisitos: 4.5_

  - [x] 6.2 Atualizar testes do `TemporadasService` para verificar classes de erro específicas
    - _Requisitos: 6.1, 6.2_

- [x] 7. Migrar GruposService para domain errors
  - [x] 7.1 Substituir `ErrorFactory` por domain errors no `GruposService`
    - `ErrorFactory.notFound(TEMPORADA_NAO_ENCONTRADA)` → `new TemporadaNaoEncontradaError()`
    - `ErrorFactory.notFound(GRUPO_NAO_ENCONTRADO)` → `new GrupoNaoEncontradoError()`
    - `ErrorFactory.badRequest(DESATIVE_ANTES_EXCLUIR)` → `new DesativeAntesDeExcluirError()`
    - _Requisitos: 4.6, 4.7, 4.8_

  - [x] 7.2 Atualizar testes do `GruposService` para verificar classes de erro específicas
    - _Requisitos: 6.1, 6.2_

- [x] 8. Migrar GrupoUsuarioService para domain errors
  - [x] 8.1 Substituir `ErrorFactory` por domain errors no `GrupoUsuarioService`
    - `ErrorFactory.notFound(CODIGO_CONVITE_INVALIDO)` → `new CodigoConviteInvalidoError()`
    - `ErrorFactory.badRequest(GRUPO_INATIVO)` → `new GrupoInativoError()`
    - `ErrorFactory.conflict(JA_ESTA_NO_GRUPO)` → `new JaEstaNoGrupoError()`
    - `ErrorFactory.badRequest(LIMITE_PARTICIPANTES)` → `new LimiteParticipantesError()`
    - `ErrorFactory.badRequest(UNICO_ADMIN)` → `new UnicoAdminError()`
    - _Requisitos: 4.9, 4.10, 4.11, 4.12, 4.13_

  - [x] 8.2 Atualizar testes do `GrupoUsuarioService` para verificar classes de erro específicas
    - _Requisitos: 6.1, 6.2_

- [x] 9. Checkpoint — Verificar migração completa
  - Rodar `sh dev npx vitest run` e garantir que todos os testes passam. Verificar que nenhum service usa `ErrorFactory` para erros que agora têm classe de domínio. Perguntar ao usuário se há dúvidas.

- [ ] 10. Testes de propriedade para domain errors
  - [ ]* 10.1 Instalar `fast-check` como dependência de desenvolvimento
    - `sh dev npm install -D fast-check`
    - _Requisitos: 1.1, 2.7_

  - [ ]* 10.2 Escrever teste de propriedade para estrutura da classe base DomainError
    - **Propriedade 1: Estrutura da classe base DomainError**
    - Gerar mensagens aleatórias, instanciar subclasses concretas, verificar `instanceof Error`, `mensagem`, `statusCode` e `name`
    - Mínimo 100 iterações
    - **Valida: Requisitos 1.1, 1.2, 1.3**

  - [ ]* 10.3 Escrever teste de propriedade para classes de erro específicas com defaults
    - **Propriedade 2: Classes de erro específicas com defaults corretos**
    - Iterar sobre as 15 classes, instanciar sem argumentos, verificar `instanceof DomainError`, `statusCode` e `mensagem` padrão
    - Mínimo 100 iterações
    - **Valida: Requisitos 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

  - [ ]* 10.4 Escrever teste de propriedade para DomainExceptionFilter
    - **Propriedade 3: DomainExceptionFilter produz formato padrão**
    - Gerar `statusCode` (400-499) e mensagens aleatórias, criar `DomainError` concreto, executar filter com mock de `ArgumentsHost`, verificar status e body
    - Mínimo 100 iterações
    - **Valida: Requisitos 3.2**

- [x] 11. Checkpoint final — Todos os testes passam
  - Rodar `sh dev npx vitest run` e garantir que todos os testes (unitários e de propriedade) passam. Perguntar ao usuário se há dúvidas.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- `ErrorFactory` permanece intacto — apenas os services são migrados (Requisito 5.1, 5.2)

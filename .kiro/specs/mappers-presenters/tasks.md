# Plano de Implementação: Mappers/Presenters

## Visão Geral

Criar Presenters com método estático `toHttp()` para transformar objetos Prisma em respostas HTTP seguras, integrar nos controllers e migrar o UsuarioResponseDto existente para o novo padrão.

## Tasks

- [x] 1. Criar Presenters base (Campeonato e Usuario)
  - [x] 1.1 Criar `src/common/presenters/campeonato.presenter.ts` com método estático `toHttp()` retornando apenas id, nome, dataCriacao, atualizadoEm
    - _Requisitos: 1.1, 6.2, 7.1_
  - [x] 1.2 Criar `src/common/presenters/usuario.presenter.ts` com método estático `toHttp()` retornando apenas id, nome, email, perfil, ativo, dataCriacao, atualizadoEm — omitindo senha, refreshTokens e relações
    - _Requisitos: 5.1, 5.2, 6.1, 6.2, 7.4_
  - [ ]* 1.3 Escrever teste de propriedade para CampeonatoPresenter
    - **Propriedade 1: Allowlist — toHttp() retorna apenas campos permitidos (Campeonato)**
    - **Valida: Requisitos 1.1, 7.1**
  - [ ]* 1.4 Escrever teste de propriedade para UsuarioPresenter
    - **Propriedade 1: Allowlist — toHttp() retorna apenas campos permitidos (Usuario)**
    - **Valida: Requisitos 5.1, 5.2, 6.1, 7.4**
  - [ ]* 1.5 Escrever teste de propriedade para preservação de valores (Campeonato e Usuario)
    - **Propriedade 4: Preservação de valores — toHttp() não altera os valores dos campos**
    - **Valida: Requisitos 1.1, 5.1, 7.1, 7.4**

- [x] 2. Criar Presenters com relações (Temporada, Grupo, GrupoUsuario)
  - [x] 2.1 Criar `src/common/presenters/temporada.presenter.ts` com `toHttp()` retornando id, ano, campeonatoId, dataCriacao e campeonato opcional via CampeonatoPresenter
    - _Requisitos: 2.1, 2.2, 7.2_
  - [x] 2.2 Criar `src/common/presenters/grupo.presenter.ts` com `toHttp()` retornando todos os campos públicos e temporada opcional via TemporadaPresenter
    - _Requisitos: 3.1, 3.2, 7.3_
  - [x] 2.3 Criar `src/common/presenters/grupo-usuario.presenter.ts` com `toHttp()` retornando id, usuarioId, grupoId, role e relações opcionais usuario/grupo via seus Presenters
    - _Requisitos: 4.1, 4.2, 4.3, 6.3_
  - [x] 2.4 Criar barrel export em `src/common/presenters/index.ts`
    - _Requisitos: 1.1, 2.1, 3.1, 4.1, 5.1_
  - [ ]* 2.5 Escrever teste de propriedade para composição de relações
    - **Propriedade 2: Composição de relações — relações presentes são transformadas recursivamente**
    - **Valida: Requisitos 2.2, 3.2, 4.2, 4.3, 6.3**
  - [ ]* 2.6 Escrever teste de propriedade para omissão de relações
    - **Propriedade 3: Omissão de relações — relações ausentes não aparecem no retorno**
    - **Valida: Requisitos 2.2, 3.2, 4.2, 4.3**
  - [ ]* 2.7 Escrever teste de propriedade para preservação de valores (Temporada, Grupo, GrupoUsuario)
    - **Propriedade 4: Preservação de valores — toHttp() não altera os valores dos campos**
    - **Valida: Requisitos 2.1, 3.1, 4.1, 7.2, 7.3**

- [x] 3. Checkpoint — Validar Presenters
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [x] 4. Integrar Presenters nos Controllers
  - [x] 4.1 Integrar CampeonatoPresenter no CampeonatosController — usar `toHttp()` nos retornos de criar e listar
    - _Requisitos: 1.2, 1.3, 8.1, 8.3_
  - [x] 4.2 Integrar TemporadaPresenter no TemporadasController — usar `toHttp()` nos retornos de criar e listar
    - _Requisitos: 2.3, 8.1, 8.3_
  - [x] 4.3 Integrar GrupoPresenter no GruposController — usar `toHttp()` nos retornos de criar, listar, buscar por ID, atualizar e alterar status
    - _Requisitos: 3.3, 8.1, 8.3_
  - [x] 4.4 Integrar GrupoUsuarioPresenter no GrupoUsuarioController — usar `toHttp()` nos retornos de entrar por convite, adicionar membro e listar membros
    - _Requisitos: 4.4, 8.1, 8.3_

- [x] 5. Migrar UsuarioResponseDto para UsuarioPresenter
  - [x] 5.1 Refatorar UsuariosService para retornar objetos Prisma diretamente em vez de usar `UsuarioResponseDto.fromEntity()`
    - _Requisitos: 8.1, 8.2_
  - [x] 5.2 Integrar UsuarioPresenter no UsuariosController — usar `toHttp()` nos retornos de criar, buscar, atualizar e listar
    - _Requisitos: 5.3, 8.2, 8.3_
  - [x] 5.3 Remover `src/modules/usuarios/dto/usuario-response.dto.ts`
    - _Requisitos: 5.4_
  - [x] 5.4 Remover `src/modules/grupos/dto/usuario-response.dto.ts`
    - _Requisitos: 5.5_

- [x] 6. Checkpoint — Validar integração completa
  - Garantir que todos os testes passam e a API retorna os mesmos campos de antes. Perguntar ao usuário se houver dúvidas.

## Notas

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade usam fast-check com Vitest
- Rodar testes via: `sh dev npx vitest run`

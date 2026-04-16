# Implementation Plan: Módulo de Ranking

## Overview

O módulo de Ranking calcula pontuações e classificações de membros dentro de grupos de bolão. Vários componentes já existem (`PontuacaoService`, constantes, presenters, domain errors, `TokenDobroService`, métodos de repositório). O foco é implementar o `RankingService` (orquestração), `RankingController` (endpoints), `RankingModule` (wiring), exportar artefatos existentes e criar testes.

## Tasks

- [x] 1. Exportar artefatos existentes e preparar infraestrutura
  - [x] 1.1 Exportar `JogoNaoFinalizadoError` no barrel `src/common/errors/domain-errors/index.ts`
    - Adicionar `export * from './ranking.errors'`
    - _Requirements: 9.3_
  - [x] 1.2 Exportar `RankingPresenter` e `PontuacaoJogoPresenter` no barrel `src/common/presenters/index.ts`
    - Adicionar exports para `RankingPresenter` e `PontuacaoJogoPresenter`
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Implementar RankingService
  - [x] 2.1 Criar `src/modules/ranking/ranking.service.ts` com métodos `obterRankingFase`, `obterRankingGeral`, `obterDetalhamentoJogo`, `processarPontuacaoJogo` e `verificarPalpitesCompletos`
    - Injetar `PontuacaoService`, `TokenDobroService`, `JogoRepository`, `FaseRepository`, `PalpiteRepository`, `PalpiteDobradoRepository`, `GrupoUsuarioRepository`, `GrupoRepository` via tokens
    - `obterRankingFase(grupoId, faseId)`: buscar grupo, fase, membros, jogos finalizados da fase, palpites batch, PalpiteDobrados batch → calcular pontuação por membro → ordenar com desempate (pontuação DESC, acertos em cheio DESC, acertos resultado DESC, nome ASC) → atribuir posições com empate
    - `obterRankingGeral(grupoId)`: buscar grupo, todas as fases da temporada, acumular pontuação de todas as fases → mesmo fluxo de ordenação e posições
    - `obterDetalhamentoJogo(grupoId, jogoId)`: buscar membros, palpites do jogo, PalpiteDobrados → para jogo FINALIZADO calcular pontuação, para não-finalizado retornar pontosBase/pontosFinais null → incluir flag dobrado
    - `processarPontuacaoJogo(jogoId)`: buscar jogo (validar FINALIZADO), buscar todos os grupos da temporada → para cada grupo: calcular pontuações, conceder TokenDobro por acerto em cheio (idempotente via `buscarPorChave`), verificar se fase encerrou → conceder tokens de posição. Erro em um grupo logado e não propaga.
    - `verificarPalpitesCompletos(faseId, grupoId)`: verificar se membros possuem palpites para todos os jogos não-cancelados da fase antes do dataHora do primeiro jogo → conceder TokenDobro PALPITES_COMPLETOS (idempotente)
    - Usar batch queries (NUNCA N+1): buscar todos os palpites e dobrados de uma vez antes do loop
    - _Requirements: 1.1-1.7, 2.1-2.4, 3.1-3.6, 4.1-4.4, 5.1-5.5, 6.1-6.3, 7.1-7.7, 8.1-8.4, 9.1-9.5, 12.1-12.4, 13.1-13.3, 14.1-14.3_

- [x] 3. Implementar RankingController e RankingModule
  - [x] 3.1 Criar `src/modules/ranking/ranking.controller.ts` com endpoints REST
    - `GET /grupos/:grupoId/ranking/geral` → `obterRankingGeral` com `RankingPresenter.toHttp`
    - `GET /grupos/:grupoId/ranking/fases/:faseId` → `obterRankingFase` com `RankingPresenter.toHttp`
    - `GET /grupos/:grupoId/ranking/jogos/:jogoId` → `obterDetalhamentoJogo` com `PontuacaoJogoPresenter.toHttp`
    - `POST /grupos/:grupoId/ranking/processar-jogo/:jogoId` → `processarPontuacaoJogo` (ADMIN only)
    - Guards: `@UseGuards(GroupRoleGuard)` + `@GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)` para GETs, `@GroupRoles(GRUPO_ROLE.ADMIN)` para POST
    - Swagger: `@ApiTags(RANKING.TAG)`, `@ApiOperation`, `@ApiResponse`
    - UUID validation via `ParseUUIDCustomPipe`
    - _Requirements: 10.1-10.5, 11.1-11.3_
  - [x] 3.2 Criar `src/modules/ranking/ranking.module.ts` com providers e imports
    - Registrar `PontuacaoService`, `RankingService`, `RankingController`
    - Importar `PalpitesModule` (para `TokenDobroService` e repositórios de palpite/dobrado/token)
    - Importar `JogosModule` (para repositórios de jogo/fase)
    - Importar `GruposModule` e `GrupoUsuarioModule` (para repositórios de grupo e grupo-usuario)
    - Registrar no `AppModule`
    - _Requirements: 10.1-10.5_

- [x] 4. Checkpoint — Verificar compilação e estrutura
  - Garantir que o projeto compila sem erros. Verificar que todos os módulos estão importados corretamente e os tokens de injeção resolvem. Perguntar ao usuário se há dúvidas.

- [x] 5. Testes unitários do PontuacaoService
  - [x] 5.1 Criar `test/modules/ranking/pontuacao.service.spec.ts` com testes unitários
    - Acerto em cheio: palpite 2x1, jogo 2x1 → 10 pontos
    - Acerto de resultado: palpite 3x1, jogo 2x0 (vitória casa) → 5 pontos
    - Acerto de resultado empate: palpite 1x1, jogo 0x0 → 5 pontos
    - Acerto de gols um time: palpite 2x1, jogo 2x3 → 3 pontos
    - Erro total: palpite 1x0, jogo 0x2 → 0 pontos
    - Palpite null → pontosBase 0, categoriaAcerto null
    - Instanciação direta: `new PontuacaoService()`
    - Imports: `import { describe, it, expect, beforeEach } from 'vitest'`
    - _Requirements: 1.1-1.7, 13.1, 13.3_
  - [ ]* 5.2 Criar `test/modules/ranking/pontuacao.service.pbt.spec.ts` com testes de propriedade
    - **Property 1: Classificação de pontuação é mutuamente exclusiva e correta**
    - **Property 2: Pontuação ignora prorrogação e pênaltis**
    - **Property 3: Palpite null resulta em 0 pontos com categoria null**
    - Usar `fast-check` com generators `arbGols = fc.nat({ max: 15 })`, `arbPalpite`, `arbPalpiteOuNull`
    - Mínimo 100 iterações por teste
    - Comentário: `// Feature: modulo-ranking, Property N: título`
    - **Validates: Requirements 1.1-1.7, 13.1, 13.3**

- [x] 6. Testes unitários do RankingService
  - [x] 6.1 Criar InMemory repositories necessários para testes (se não existirem) e criar `test/modules/ranking/ranking.service.spec.ts`
    - Instanciação direta: `new RankingService(pontuacaoService, tokenDobroService, ...inMemoryRepos)`
    - Cenários: ranking por fase happy path, ranking sem jogos finalizados (todos 0 pontos), ranking geral acumulando fases, detalhamento jogo finalizado, detalhamento jogo não-finalizado (pontuação null), processamento com tokens acerto em cheio, fase encerrada com tokens posição, fase não encerrada sem tokens posição, erro em grupo não propaga, idempotência (processar 2x não duplica tokens), grupo inexistente → erro, fase inexistente → erro, jogo inexistente → erro, palpites completos → token, fase com apenas cancelados → sem tokens posição, multiplicador dobro aplicado corretamente por grupo
    - _Requirements: 1.1-1.7, 2.1-2.4, 3.1-3.6, 4.1-4.4, 5.1-5.5, 6.1-6.3, 7.1-7.7, 8.1-8.4, 9.1-9.5, 12.1-12.4, 13.1-13.3, 14.1-14.3_
  - [ ]* 6.2 Criar `test/modules/ranking/ranking.service.pbt.spec.ts` com testes de propriedade
    - **Property 4: Multiplicador de dobro aplicado corretamente por contexto de grupo**
    - **Property 5: Ranking ordenado por pontuação decrescente com desempate determinístico**
    - **Property 6: Membros sem palpites aparecem no ranking com pontuação zero**
    - **Property 7: Apenas jogos FINALIZADO contribuem para o ranking**
    - **Property 8: Detalhamento de jogo não-finalizado retorna pontuação null**
    - **Property 9: Flag dobrado reflete corretamente a existência de PalpiteDobrado**
    - **Property 10: TokenDobro por acerto em cheio concedido corretamente**
    - **Property 11: TokenDobro por posição no ranking da fase concedido corretamente**
    - **Property 12: TokenDobro por palpites completos na fase**
    - **Property 13: Idempotência do processamento de pontuação e concessão de tokens**
    - **Property 14: Processamento multi-grupo ao finalizar jogo**
    - Usar InMemory repositories com dados gerados via fast-check
    - **Validates: Requirements 2.1-2.4, 3.1-3.6, 4.1-4.2, 5.2, 5.4, 6.1-6.3, 7.1-7.7, 8.1-8.4, 9.1-9.5, 12.1-12.4, 13.1-13.3, 14.1-14.3**

- [x] 7. Testes unitários do RankingController e Presenters
  - [x] 7.1 Criar `test/modules/ranking/ranking.controller.spec.ts`
    - Instanciação direta: `new RankingController(mockRankingService as any)`
    - Verificar que rotas delegam para RankingService
    - Verificar que presenters são aplicados nas respostas
    - _Requirements: 10.1-10.5, 11.1-11.3_
  - [ ]* 7.2 Criar `test/common/presenters/ranking.presenter.spec.ts` e `test/common/presenters/pontuacao-jogo.presenter.spec.ts`
    - **Property 15: RankingPresenter retorna apenas campos da allowlist**
    - **Property 16: PontuacaoJogoPresenter retorna apenas campos da allowlist**
    - Testar que campos extras no input não vazam para o output
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [x] 8. Checkpoint — Rodar todos os testes e validar
  - Rodar `docker exec bolao-backend-dev npx vitest run` e garantir que todos os testes passam. Perguntar ao usuário se há dúvidas.

- [x] 9. Atualizar Postman Collection e README
  - [x] 9.1 Adicionar endpoints de ranking ao `postman_collection.json`
    - Folder "Ranking" com 4 requests: ranking geral, ranking fase, detalhamento jogo, processar pontuação
    - Endpoints autenticados herdam Bearer token da collection
    - _Requirements: 10.1-10.5_
  - [x] 9.2 Atualizar `README.md` com módulo de ranking
    - Adicionar módulo Ranking na estrutura de módulos
    - Documentar endpoints e regras de pontuação
    - _Requirements: 10.1-10.5_

- [x] 10. Final checkpoint — Garantir que tudo está integrado
  - Rodar todos os testes, verificar compilação, confirmar que Postman e README estão atualizados. Perguntar ao usuário se há dúvidas.

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- `PontuacaoService`, `ranking.constants.ts`, `RankingPresenter`, `PontuacaoJogoPresenter`, `JogoNaoFinalizadoError` e `TokenDobroService` já existem — não precisam ser recriados
- Métodos de repositório necessários (`listarPorJogosEUsuarios`, `listarPorJogosEGrupo`, `listarPorGrupoComUsuario`, `buscarPorTemporadaId`, `buscarPorChave`) já existem nas interfaces
- O mapeamento `PST → AGENDADO` no `mapearStatusApiFootball` já está implementado
- Testes ficam em `test/` (não `src/`), usando alias `@src/` para imports
- Testes usam InMemory repositories, NUNCA TestingModule
- Rodar testes: `docker exec bolao-backend-dev npx vitest run`

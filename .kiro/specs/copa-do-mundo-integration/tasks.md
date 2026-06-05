# Plano de Implementação: Integração Copa do Mundo

## Visão Geral

Refatorar o `FutebolApiService` e o fluxo de importação/sincronização para suportar múltiplos campeonatos via registry de configurações (`CampeonatoConfig`). A mudança é na construção de URLs, validação de rodadas por fase, e parametrização dos métodos existentes — sem alteração no schema Prisma.

## Tasks

- [ ] 1. Definir constantes e tipos do CampeonatoConfig
  - [ ] 1.1 Criar constantes da Copa do Mundo e registry em `jogos.constants.ts`
    - Adicionar interfaces `FaseConfig` e `CampeonatoConfig` no arquivo de constantes
    - Definir `COPA_DO_MUNDO_2026` config com `campeonatoId: 'b5ff9c28-476e-4816-a699-7645acc94cd0'`, fases (grupos com maxRodadas 3, knockout com maxRodadas 1), e `buildFaseSlug`
    - Definir `BRASILEIRAO` config com `campeonatoId: 'd1a37fa4-e948-43a6-ba53-ab24ab3a45b1'`, fase única com maxRodadas 38, e `buildFaseSlug` usando pattern `fase-unica-campeonato-brasileiro-{season}`
    - Criar `CAMPEONATO_CONFIGS: Record<string, CampeonatoConfig>` com chaves `'brasileirao'` e `'copa-do-mundo-2026'`
    - Criar função `obterCampeonatoConfig(slug: string): CampeonatoConfig` que lança erro se slug não encontrado
    - Adicionar constantes nomeadas: `COPA_TOTAL_GRUPOS = 12`, `COPA_TIMES_POR_GRUPO = 4`
    - Migrar `BRASILEIRAO_CAMPEONATO_ID` e `GE_BASE_URL` do `futebol-api.service.ts` para constantes
    - Adicionar mensagens de erro: `CAMPEONATO_NAO_SUPORTADO`, `RODADA_FORA_DO_LIMITE`, `FASE_SLUG_INVALIDA`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 1.2 Criar Domain Errors para campeonato não suportado, rodada fora do limite e fase slug inválida
    - Criar `CampeonatoNaoSuportadoError` (statusCode 400) em `src/common/errors/domain-errors/jogos.errors.ts`
    - Criar `RodadaForaDoLimiteError` (statusCode 400) em `src/common/errors/domain-errors/jogos.errors.ts`
    - Criar `FaseSlugInvalidaError` (statusCode 400) em `src/common/errors/domain-errors/jogos.errors.ts`
    - Exportar nos barrel exports (`index.ts`)
    - _Requirements: 3.5, 3.6, 8.1, 8.2, 8.3, 8.4_

  - [ ] 1.3 Escrever testes unitários para `obterCampeonatoConfig` e validação de rodada
    - Testar que `obterCampeonatoConfig('brasileirao')` retorna config correto
    - Testar que `obterCampeonatoConfig('copa-do-mundo-2026')` retorna config correto
    - Testar que `obterCampeonatoConfig('invalido')` lança `CampeonatoNaoSuportadoError`
    - Testar que fases da Copa do Mundo têm maxRodadas corretos (3 para grupos, 1 para knockout)
    - _Requirements: 1.1, 1.3, 1.4, 3.5_

  - [ ]* 1.4 Escrever property test para registry de CampeonatoConfig (Property 6)
    - **Property 6: Slug de campeonato não reconhecido lança CampeonatoNaoSuportadoError**
    - Usar fast-check para gerar strings arbitrárias que não sejam `'brasileirao'` nem `'copa-do-mundo-2026'`
    - Verificar que `obterCampeonatoConfig` lança `CampeonatoNaoSuportadoError` para qualquer slug não registrado
    - _Requisitos: 3.5_

  - [ ]* 1.5 Escrever property test para validação de rodada (Property 7)
    - **Property 7: Validação de rodada respeita limites configurados por campeonato/fase**
    - Usar fast-check para gerar rodadas no range [1, maxRodadas] e verificar aceitação
    - Gerar rodadas > maxRodadas e < 1 e verificar rejeição com domain error
    - Testar para todas as combinações campeonato/fase do registry
    - _Requisitos: 3.6, 5.5, 5.6, 8.1, 8.2, 8.3, 8.4_

- [ ] 2. Refatorar FutebolApiService para suporte multi-campeonato
  - [ ] 2.1 Refatorar `buscarJogosPorRodada` para receber `campeonatoId` e `faseSlug`
    - Alterar assinatura de `buscarJogosPorRodada(season: number, rodada: number)` para `buscarJogosPorRodada(campeonatoId: string, faseSlug: string, rodada: number)`
    - Construir URL usando parâmetros recebidos em vez de hardcoded
    - Remover constantes locais `GE_BASE_URL` e `BRASILEIRAO_CAMPEONATO_ID` (agora em constants)
    - Importar `GE_BASE_URL` de `jogos.constants.ts`
    - _Requirements: 1.2, 6.1, 6.2_

  - [ ] 2.2 Refatorar `buscarJogosPorIds` para usar CampeonatoConfig
    - Alterar assinatura para receber `ids: number[]` e `config: CampeonatoConfig`
    - Iterar sobre `config.fases` e seus `maxRodadas` em vez de hardcoded 1-38
    - Usar `config.buildFaseSlug` para construir o slug de cada fase
    - Chamar `buscarJogosPorRodada` com os parâmetros corretos do config
    - _Requirements: 6.5_

  - [ ] 2.3 Escrever testes unitários para FutebolApiService refatorado
    - Testar construção de URL para Brasileirão (pattern existente)
    - Testar construção de URL para Copa do Mundo (novo pattern)
    - Testar que `buscarJogosPorIds` itera fases/rodadas corretas do config
    - Mock de `fetch` global para validar URLs chamadas
    - Testar que `normalizarJogo` e `mapearStatus` continuam inalterados
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 2.4 Escrever property test para construção de URL (Property 1)
    - **Property 1: Construção de URL usa parâmetros do config**
    - Usar fast-check para gerar `campeonatoId` (uuid), `faseSlug` (string alfanumérica com hífens), e `rodada` (inteiro positivo)
    - Verificar que a URL construída contém `campeonatoId` e `faseSlug` nos segmentos corretos
    - _Requisitos: 1.2, 6.1, 6.2_

  - [ ]* 2.5 Escrever property test para consistência da normalização (Property 2)
    - **Property 2: Normalização produz estrutura consistente independente do campeonato**
    - Usar fast-check para gerar objetos raw de jogo com campos obrigatórios (`equipes.mandante`, `equipes.visitante`, status)
    - Verificar que `normalizarJogo` sempre produz objeto com todas as chaves esperadas
    - _Requisitos: 2.2, 6.3, 6.4_

  - [ ]* 2.6 Escrever property test para iteração do buscarJogosPorIds (Property 11)
    - **Property 11: buscarJogosPorIds itera fases/rodadas corretas por config**
    - Verificar que para qualquer CampeonatoConfig, o método itera sobre todas as combinações fase/rodada definidas
    - _Requisitos: 6.5_

- [ ] 3. Checkpoint - Verificar refatoração do FutebolApiService
  - Garantir que todos os testes passam. Perguntar ao usuário se surgirem dúvidas.

- [ ] 4. Expandir ImportarJogosDto e fluxo de importação
  - [ ] 4.1 Atualizar `ImportarJogosDto` com campos `campeonatoSlug` e `faseSlug`
    - Adicionar campo `campeonatoSlug` com tipo union `'brasileirao' | 'copa-do-mundo-2026'` e validação `@IsIn`
    - Adicionar campo `faseSlug` com `@IsString` e `@IsNotEmpty`
    - Remover campo `season` (não mais necessário — o slug da fase já contém a temporada)
    - Remover `@Max(38)` do campo `rodada` (validação agora é dinâmica no service)
    - Manter `faseId` (UUID da fase no banco) e `rodada` (mínimo 1)
    - Mensagens de validação em português
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ] 4.2 Refatorar `JogoService.importarJogos` para usar CampeonatoConfig
    - Alterar assinatura para receber `ImportarJogosDto` completo + `userId`
    - Resolver config via `obterCampeonatoConfig(dto.campeonatoSlug)`
    - Validar que `dto.faseSlug` existe no config (lançar `FaseSlugInvalidaError` se não)
    - Validar que `dto.rodada` está no range [1, faseConfig.maxRodadas] (lançar `RodadaForaDoLimiteError` se não)
    - Construir `faseSlug` completo via `config.buildFaseSlug(season, dto.faseSlug)` ou usar diretamente
    - Chamar `futebolApiService.buscarJogosPorRodada(config.campeonatoId, faseSlugCompleto, dto.rodada)`
    - Manter lógica de normalização, resolução de times e persistência inalterada
    - Adicionar suporte a `penaltisCasa`/`penaltisFora` na persistência (jogos mata-mata da Copa)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.3, 3.4, 3.5, 3.6, 8.1, 8.2, 8.3, 8.4_

  - [ ] 4.3 Atualizar `JogoController` para usar novo DTO na rota de importação
    - Ajustar chamada ao service para passar o DTO completo
    - Manter guard `SuperAdminGuard` e decorators Swagger
    - _Requirements: 2.1, 3.1_

  - [ ] 4.4 Escrever testes unitários para importação multi-campeonato
    - Testar importação de jogos da Copa do Mundo (fase de grupos, rodada 1-3)
    - Testar importação de jogos da Copa do Mundo (fase knockout, rodada 1)
    - Testar que `CampeonatoNaoSuportadoError` é lançado para slug inválido
    - Testar que `RodadaForaDoLimiteError` é lançado para rodada > maxRodadas
    - Testar que `FaseSlugInvalidaError` é lançado para faseSlug inexistente no config
    - Testar backward compatibility: importação do Brasileirão continua funcionando
    - Testar que `fonteResultado` é sempre `API_EXTERNA` nos jogos importados
    - Testar auto-criação de times com dados da API
    - Usar InMemory repositories
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.7, 3.3, 3.4, 3.5, 3.6, 8.1, 8.2, 8.3_

  - [ ]* 4.5 Escrever property test para invariante fonteResultado (Property 3)
    - **Property 3: Importação sempre define fonteResultado como API_EXTERNA**
    - Usar fast-check para gerar jogos arbitrários importados via API
    - Verificar que todos os registros persistidos têm `fonteResultado === 'API_EXTERNA'`
    - _Requisitos: 2.3_

  - [ ]* 4.6 Escrever property test para conversão BRT→UTC (Property 4)
    - **Property 4: Conversão BRT para UTC adiciona offset -03:00**
    - Usar fast-check para gerar strings de data válidas (ano >= 2020)
    - Verificar que a conversão produz datetime exatamente 3 horas à frente do BRT
    - _Requisitos: 2.5_

  - [ ]* 4.7 Escrever property test para auto-criação de times (Property 5)
    - **Property 5: Importação cria times automaticamente com dados corretos**
    - Usar fast-check para gerar dados de time (externoId, nome, sigla, escudo)
    - Verificar que após importação, o time é recuperável por externoId com dados corretos
    - _Requisitos: 2.7_

- [ ] 5. Checkpoint - Verificar importação multi-campeonato
  - Garantir que todos os testes passam. Perguntar ao usuário se surgirem dúvidas.

- [ ] 6. Refatorar sincronização de placares para multi-campeonato
  - [ ] 6.1 Refatorar `JogoService.sincronizarPlacares` para determinar config por campeonato
    - Ao buscar jogos pendentes, agrupar por campeonato (via fase → temporada → campeonato)
    - Para cada grupo, resolver o `CampeonatoConfig` correto
    - Chamar `buscarJogosPorIds` com o config correto em vez de hardcoded
    - Adicionar suporte a `penaltisCasa`/`penaltisFora` no `preencherPlacarSync` para jogos mata-mata
    - Manter comportamento de fallback quando API indisponível (logar warning, retornar `{ sincronizados: 0 }`)
    - Filtrar apenas jogos com `fonteResultado === 'API_EXTERNA'` (já existente, manter)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 6.2 Adicionar método no repositório para buscar jogos com relação de campeonato
    - Adicionar método `buscarPorFaseComCampeonato(faseId: string)` na interface do repositório
    - Implementar no Prisma repository com include de fase → temporada → campeonato
    - Implementar no InMemory repository
    - _Requirements: 4.1_

  - [ ] 6.3 Escrever testes unitários para sincronização multi-campeonato
    - Testar sync de jogos da Copa do Mundo com placares e pênaltis
    - Testar que transições de status são respeitadas (AGENDADO→EM_ANDAMENTO→FINALIZADO)
    - Testar que jogos com `fonteResultado = 'MANUAL'` não são afetados pelo sync
    - Testar comportamento quando API indisponível (log + skip)
    - Testar atualização de `penaltisCasa`/`penaltisFora` em jogos mata-mata
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 6.4 Escrever property test para transições de status (Property 8)
    - **Property 8: Sync respeita transições válidas de status**
    - Usar fast-check para gerar pares (statusAtual, statusNovo) e verificar que apenas transições válidas são aplicadas
    - _Requisitos: 4.2_

  - [ ]* 6.5 Escrever property test para sync de placares/pênaltis (Property 9)
    - **Property 9: Sync atualiza placares e pênaltis corretamente**
    - Usar fast-check para gerar placares e pênaltis da API e verificar que os valores são corretamente persistidos
    - _Requisitos: 4.3, 4.4_

  - [ ]* 6.6 Escrever property test para filtro de fonteResultado (Property 10)
    - **Property 10: Sync atualiza apenas jogos com fonteResultado API_EXTERNA**
    - Usar fast-check para gerar mix de jogos com fonteResultado MANUAL e API_EXTERNA
    - Verificar que apenas jogos API_EXTERNA são atualizados
    - _Requisitos: 4.5_

- [ ] 7. Checkpoint - Verificar sincronização multi-campeonato
  - Garantir que todos os testes passam. Perguntar ao usuário se surgirem dúvidas.

- [ ] 8. Atualizar Postman collection e wiring final
  - [ ] 8.1 Atualizar `postman_collection.json` com novos campos do endpoint de importação
    - Atualizar body do `POST /jogos/importar` com campos `campeonatoSlug`, `faseSlug`, `rodada`, `faseId`
    - Remover campo `season` do body
    - Adicionar exemplos para Copa do Mundo e Brasileirão
    - _Requirements: 3.1, 3.2_

  - [ ] 8.2 Adicionar campo `tema` no CampeonatoConfig e expor nos Presenters
    - Adicionar interface `TemaConfig` com `corPrimaria` e `corSecundaria` em `jogos.constants.ts`
    - Adicionar `tema` no `CampeonatoConfig` da Copa do Mundo: `{ corPrimaria: '#009739', corSecundaria: '#FEDD00' }`
    - Adicionar `tema` no `CampeonatoConfig` do Brasileirão: `{ corPrimaria: '#1B5E20', corSecundaria: '#FFFFFF' }`
    - Atualizar Presenter de campeonato/temporada para incluir `tema` na resposta
    - Atualizar Presenter de grupo para incluir `tema` do campeonato associado
    - Escrever testes unitários verificando que o tema é retornado corretamente
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 8.3 Atualizar módulo NestJS e garantir wiring correto
    - Verificar que `JogosModule` exporta/provê todos os services e repositories necessários
    - Garantir que não há imports circulares
    - Verificar que o `FutebolApiService` continua injetável sem alterações no module
    - _Requirements: 1.1, 1.2_

- [ ] 9. Checkpoint final - Rodar todos os testes e validar integração
  - Garantir que todos os testes passam. Perguntar ao usuário se surgirem dúvidas.

## Notas

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests validam propriedades universais de corretude do documento de design
- Testes unitários validam exemplos específicos e edge cases
- O projeto usa Docker — todos os comandos de teste via `sh dev npx vitest run`
- Não há alteração no schema Prisma — a hierarquia existente já suporta a Copa do Mundo
- `normalizarJogo` e `mapearStatus` não precisam de alteração (já suportam o formato da Copa)
- A refatoração mantém backward compatibility total com o Brasileirão

## Grafo de Dependência das Tasks

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "2.6"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "4.5", "4.6", "4.7"] },
    { "id": 6, "tasks": ["6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3", "6.4", "6.5", "6.6"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```

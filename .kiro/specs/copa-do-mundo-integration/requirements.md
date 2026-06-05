# Documento de Requisitos

## Introdução

Integração do sistema de bolão com a Copa do Mundo FIFA 2026. O `FutebolApiService` atualmente suporta apenas o Brasileirão (campeonato de pontos corridos com 38 rodadas). Esta feature adiciona suporte multi-campeonato, permitindo importar e sincronizar jogos da Copa do Mundo 2026 — que possui fase de grupos (12 grupos, 3 rodadas cada) e fases eliminatórias (32 avos de final, oitavas, quartas, semifinais, terceiro lugar e final).

A API externa (ge.globo.com) já suporta a Copa do Mundo com o mesmo formato de dados, diferindo apenas nos identificadores de campeonato e fase.

## Glossário

- **FutebolApiService**: Service responsável pela comunicação com a API externa do ge.globo.com para buscar jogos e classificações
- **Campeonato**: Entidade raiz que representa uma competição (Brasileirão, Copa do Mundo)
- **Temporada**: Período de uma edição do campeonato (ex: Copa do Mundo 2026)
- **Fase**: Etapa dentro de uma temporada (fase de grupos, oitavas, quartas, etc.)
- **Jogo**: Partida entre dois times dentro de uma fase
- **ImportacaoService**: Service responsável por importar jogos da API externa para o banco de dados
- **SincronizacaoService**: Service responsável por atualizar placares e status de jogos já importados
- **CampeonatoConfig**: Objeto de configuração que define os parâmetros de acesso à API externa para cada campeonato (campeonato_id, fases disponíveis, rodadas por fase)
- **Fase_Slug**: Identificador textual da fase na API externa (ex: `fase-de-grupos-copa-do-mundo-2026`)
- **Rodada**: Número sequencial de jogos dentro de uma fase (1-38 no Brasileirão, 1-3 na fase de grupos da Copa)

## Requisitos

### Requisito 1: Configuração Multi-Campeonato

**User Story:** Como SUPER_ADMIN, quero que o sistema suporte múltiplas configurações de competição, para que eu possa importar jogos tanto do Brasileirão quanto da Copa do Mundo usando a mesma integração com a API.

#### Critérios de Aceitação

1. O FutebolApiService DEVE suportar um registry de objetos CampeonatoConfig, cada um contendo campeonato_id, fase slugs disponíveis e máximo de rodadas por fase
2. QUANDO um novo campeonato é registrado na configuração, O FutebolApiService DEVE usar o campeonato_id e fase_slug correspondentes para construir as URLs da API
3. O CampeonatoConfig da Copa do Mundo 2026 DEVE definir campeonato_id como `b5ff9c28-476e-4816-a699-7645acc94cd0`
4. O CampeonatoConfig da Copa do Mundo 2026 DEVE definir os seguintes fase slugs: `fase-de-grupos-copa-do-mundo-2026`, `32avos-de-final-copa-do-mundo-2026`, `oitavas-de-final-copa-do-mundo-2026`, `quartas-de-final-copa-do-mundo-2026`, `semifinais-copa-do-mundo-2026`, `disputa-terceiro-lugar-copa-do-mundo-2026`, `final-copa-do-mundo-2026`
5. O CampeonatoConfig do Brasileirão DEVE manter compatibilidade retroativa com o campeonato_id existente `d1a37fa4-e948-43a6-ba53-ab24ab3a45b1` e o padrão de fase slug `fase-unica-campeonato-brasileiro-{season}`

### Requisito 2: Importação de Jogos da Copa do Mundo

**User Story:** Como SUPER_ADMIN, quero importar jogos da Copa do Mundo para uma fase e rodada específicas, para que os usuários possam fazer palpites nos jogos do Mundial.

#### Critérios de Aceitação

1. QUANDO um SUPER_ADMIN solicita importação de jogos da Copa do Mundo, O ImportacaoService DEVE aceitar um identificador de campeonato, fase slug e número de rodada como parâmetros
2. QUANDO a API retorna jogos para a fase e rodada especificadas, O ImportacaoService DEVE normalizar cada jogo usando o método `normalizarJogo` existente
3. QUANDO um jogo é importado da Copa do Mundo, O ImportacaoService DEVE definir `fonteResultado` como `API_EXTERNA`
4. QUANDO um jogo da API tem `data_realizacao` igual a null, O ImportacaoService DEVE importar o jogo com status `ADIADO` e `dataHora` null
5. QUANDO um jogo da API tem uma `data_realizacao` válida, O ImportacaoService DEVE converter o datetime BRT para UTC adicionando o offset `-03:00` antes de persistir
6. QUANDO um jogo da API tem uma `data_realizacao` que resulta em um ano anterior a 2020, O ImportacaoService DEVE tratar a data como inválida e definir status como `ADIADO` com `dataHora` null
7. QUANDO importando jogos, O ImportacaoService DEVE criar registros de Time automaticamente para times que ainda não existem no banco, usando `externoId`, `nome`, `sigla` e `escudo` da resposta da API
8. SE a API externa estiver indisponível durante a importação, ENTÃO O ImportacaoService DEVE lançar um `ApiExternaIndisponivelError`

### Requisito 3: Importação Multi-Campeonato via DTO

**User Story:** Como SUPER_ADMIN, quero que o endpoint de importação aceite um identificador de campeonato, para que eu possa especificar de qual competição importar os jogos.

#### Critérios de Aceitação

1. O ImportarJogosDto DEVE incluir um campo `campeonatoSlug` que identifica qual configuração de campeonato usar
2. O ImportarJogosDto DEVE incluir um campo `faseSlug` que identifica a fase específica dentro do campeonato
3. QUANDO `campeonatoSlug` for `copa-do-mundo-2026`, O ImportacaoService DEVE usar o CampeonatoConfig da Copa do Mundo
4. QUANDO `campeonatoSlug` for `brasileirao`, O ImportacaoService DEVE usar o CampeonatoConfig do Brasileirão
5. QUANDO `campeonatoSlug` não for reconhecido, O ImportacaoService DEVE lançar um domain error indicando que o campeonato não é suportado
6. O ImportarJogosDto DEVE validar que `rodada` está dentro do range válido para a combinação de campeonato e fase especificada

### Requisito 4: Sincronização de Placares da Copa do Mundo

**User Story:** Como SUPER_ADMIN, quero que a sincronização de placares funcione para jogos da Copa do Mundo, para que os resultados sejam atualizados automaticamente a partir da API externa.

#### Critérios de Aceitação

1. QUANDO a sincronização é disparada para jogos da Copa do Mundo, O SincronizacaoService DEVE buscar os dados atuais dos jogos na API usando o campeonato_id e fase_slug corretos
2. QUANDO a API retorna um status atualizado para um jogo da Copa do Mundo, O SincronizacaoService DEVE atualizar o status do jogo seguindo as transições válidas (AGENDADO→EM_ANDAMENTO, EM_ANDAMENTO→FINALIZADO)
3. QUANDO a API retorna um placar final para um jogo da Copa do Mundo, O SincronizacaoService DEVE atualizar os campos `golsCasa` e `golsFora`
4. QUANDO a API retorna placares de pênaltis para um jogo eliminatório da Copa do Mundo, O SincronizacaoService DEVE atualizar os campos `penaltisCasa` e `penaltisFora`
5. O SincronizacaoService DEVE atualizar apenas jogos onde `fonteResultado` é igual a `API_EXTERNA`
6. SE a API externa estiver indisponível durante a sincronização, ENTÃO O SincronizacaoService DEVE logar o erro e pular o ciclo de sincronização sem lançar uma exceção não tratada

### Requisito 5: Estrutura de Fases da Copa do Mundo

**User Story:** Como SUPER_ADMIN, quero criar a estrutura de fases da Copa do Mundo (grupos + eliminatórias), para que os jogos sejam organizados corretamente dentro do torneio.

#### Critérios de Aceitação

1. O sistema DEVE suportar a criação de uma Temporada para a Copa do Mundo 2026 vinculada a um registro de Campeonato
2. O sistema DEVE suportar a criação de registros de Fase do tipo `PONTOS_CORRIDOS` para a fase de grupos (representando cada grupo A-L)
3. O sistema DEVE suportar a criação de registros de Fase do tipo `MATA_MATA` para as fases eliminatórias (32 avos de final, oitavas, quartas, semifinais, terceiro lugar, final)
4. QUANDO uma Fase do tipo `MATA_MATA` é criada para fases eliminatórias da Copa do Mundo, O sistema DEVE permitir que `rodada` seja null nos registros de Jogo dentro dessa fase
5. QUANDO uma Fase de fase de grupos da Copa do Mundo é criada, O sistema DEVE aceitar valores de rodada de 1 a 3
6. QUANDO uma Fase eliminatória da Copa do Mundo é criada, O sistema DEVE aceitar valor de rodada igual a 1 (rodada única por fase eliminatória)

### Requisito 6: Busca de Jogos por Campeonato na API Externa

**User Story:** Como desenvolvedor, quero que o FutebolApiService construa URLs corretas da API para qualquer campeonato suportado, para que o mesmo service lide com múltiplas competições.

#### Critérios de Aceitação

1. QUANDO `buscarJogosPorRodada` é chamado com parâmetros da Copa do Mundo, O FutebolApiService DEVE construir a URL como `https://api.globoesporte.globo.com/tabela/{campeonato_id}/fase/{fase_slug}/rodada/{rodada}/jogos/`
2. QUANDO `buscarJogosPorRodada` é chamado com parâmetros do Brasileirão, O FutebolApiService DEVE manter o padrão de URL existente usando o campeonato_id e fase slug do Brasileirão
3. O FutebolApiService DEVE reutilizar o método `normalizarJogo` existente para jogos tanto do Brasileirão quanto da Copa do Mundo sem modificação
4. O FutebolApiService DEVE reutilizar o método `mapearStatus` existente para jogos tanto do Brasileirão quanto da Copa do Mundo sem modificação
5. QUANDO `buscarJogosPorIds` é chamado para jogos da Copa do Mundo, O FutebolApiService DEVE iterar sobre as fases e rodadas relevantes da configuração da Copa do Mundo em vez de rodadas hardcoded 1-38

### Requisito 7: Constantes da Copa do Mundo

**User Story:** Como desenvolvedor, quero que os valores de configuração da Copa do Mundo sejam definidos como constantes, para que não haja strings ou números mágicos no código.

#### Critérios de Aceitação

1. O sistema DEVE definir o campeonato_id da Copa do Mundo como uma constante nomeada no arquivo de constantes do módulo jogos
2. O sistema DEVE definir todos os fase slugs da Copa do Mundo como constantes nomeadas
3. O sistema DEVE definir o número máximo de rodadas por fase da Copa do Mundo como constantes nomeadas (3 para grupos, 1 para fases eliminatórias)
4. O sistema DEVE definir o total de grupos (12) e times por grupo (4) como constantes nomeadas
5. O sistema DEVE definir o campeonato_id do Brasileirão como uma constante nomeada (migrando do valor hardcoded atual)

### Requisito 8: Validação de Rodada por Fase e Campeonato

**User Story:** Como SUPER_ADMIN, quero que o sistema valide que o número da rodada é válido para a fase especificada, para que importações inválidas sejam rejeitadas antecipadamente.

#### Critérios de Aceitação

1. QUANDO importando jogos para uma fase de grupos da Copa do Mundo com rodada maior que 3, O ImportacaoService DEVE rejeitar a requisição com um domain error
2. QUANDO importando jogos para uma fase eliminatória da Copa do Mundo com rodada maior que 1, O ImportacaoService DEVE rejeitar a requisição com um domain error
3. QUANDO importando jogos para uma fase do Brasileirão com rodada maior que 38, O ImportacaoService DEVE rejeitar a requisição com um domain error
4. QUANDO importando jogos com rodada menor que 1, O ImportacaoService DEVE rejeitar a requisição com um erro de validação

### Requisito 9: Configuração de Tema Visual por Campeonato

**User Story:** Como frontend, quero receber do backend a configuração de tema (cores) de cada campeonato, para que eu possa aplicar um layout diferenciado (ex: verde e amarelo para Copa do Mundo).

#### Critérios de Aceitação

1. O CampeonatoConfig DEVE incluir um objeto `tema` contendo `corPrimaria` e `corSecundaria` como strings hexadecimais
2. O tema da Copa do Mundo 2026 DEVE definir `corPrimaria` como `#009739` (verde) e `corSecundaria` como `#FEDD00` (amarelo)
3. O tema do Brasileirão DEVE definir `corPrimaria` como `#1B5E20` (verde escuro) e `corSecundaria` como `#FFFFFF` (branco)
4. QUANDO o endpoint de listagem de campeonatos ou detalhes de temporada é chamado, O Presenter DEVE incluir o objeto `tema` na resposta
5. QUANDO o endpoint de listagem de grupos é chamado, O Presenter DEVE incluir o `tema` do campeonato associado à temporada do grupo

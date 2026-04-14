# Documento de Requisitos — Módulo de Jogos

## Introdução

Módulo responsável pelo gerenciamento de jogos dentro de temporadas de campeonatos de futebol. Suporta dois formatos de competição: Pontos Corridos (liga) e Mata-Mata (eliminatórias), incluindo regras para prorrogação, pênaltis e jogos de ida e volta. Jogos são organizados em Fases, que pertencem a uma Temporada. O módulo opera em modo híbrido: jogos podem ser criados manualmente ou importados da API-Football (via RapidAPI), com sincronização automática de placares. O campo fonteResultado rastreia a origem de cada jogo, e edições manuais são protegidas contra sobrescrita pela sincronização. Cobertura inicial: Brasileirão Série A e Copa do Mundo 2026.

## Glossário

- **Sistema**: A API REST do Bolão Backend
- **Fase**: Agrupamento de jogos dentro de uma temporada (ex: "Rodada 1", "Quartas de Final"), com tipo PONTOS_CORRIDOS ou MATA_MATA
- **Jogo**: Partida entre dois times, pertencente a uma Fase, com placar, status e regras de resultado
- **StatusJogo**: Enum que define o estado do jogo — AGENDADO, EM_ANDAMENTO, FINALIZADO, CANCELADO
- **TipoFase**: Enum que define o formato da fase — PONTOS_CORRIDOS ou MATA_MATA
- **Tempo_Normal**: Placar principal do jogo (golsCasa, golsFora)
- **Prorrogação**: Período extra disputado em caso de empate no tempo normal em fases mata-mata
- **Pênaltis**: Disputa de pênaltis após empate na prorrogação em fases mata-mata
- **Jogo_Ida**: Primeiro jogo de um confronto ida e volta (ehJogoVolta = false)
- **Jogo_Volta**: Segundo jogo de um confronto ida e volta (ehJogoVolta = true)
- **grupoIdaVolta**: Identificador que agrupa dois jogos (ida e volta) de um mesmo confronto
- **vencedorId**: ID do time vencedor, obrigatório em jogos mata-mata finalizados
- **Confronto**: Entidade opcional que agrupa dois times em uma fase mata-mata
- **fonteResultado**: Enum que indica a origem do resultado do jogo — MANUAL ou API_FOOTBALL
- **externoId**: Identificador do jogo na API-Football (fixture ID), nullable
- **API-Football**: API externa de dados de futebol acessada via RapidAPI, usada para importar jogos e sincronizar placares
- **Fixture**: Representação de um jogo na API-Football, contendo times, data, placar e status
- **ApiFootballService**: Service responsável pela comunicação com a API-Football via RapidAPI
- **FaseRepository**: Interface de repositório para operações de persistência de Fase
- **JogoRepository**: Interface de repositório para operações de persistência de Jogo
- **FaseService**: Service responsável pela lógica de negócio de Fases
- **JogoService**: Service responsável pela lógica de negócio de Jogos
- **definirStatusFinal**: Método do JogoService que determina o status correto de um jogo priorizando dados da API externa e usando cálculo interno como fallback
- **calcularStatusInterno**: Método do JogoService que calcula o status de um jogo baseado na data/hora atual em relação à dataHora do jogo, usado quando a API externa está indisponível
- **mapearStatus**: Método do JogoService que converte status da API-Football (SCHEDULED, LIVE, IN_PLAY, FINISHED, CANCELLED) para o enum StatusJogo interno

## Requisitos

### Requisito 1: Gerenciamento de Fases

**User Story:** Como administrador, quero criar e gerenciar fases dentro de uma temporada, para organizar os jogos em rodadas ou etapas eliminatórias.

#### Critérios de Aceitação

1. WHEN uma requisição de criação de fase é recebida com temporadaId, nome, tipo, ordem e idaVolta válidos, THE FaseService SHALL criar a Fase com os dados informados e retornar a Fase criada
2. WHEN uma requisição de criação de fase é recebida com um temporadaId inexistente, THE FaseService SHALL lançar um erro TemporadaNaoEncontradaError com status 404
3. WHEN uma requisição de listagem de fases é recebida com um temporadaId válido, THE FaseService SHALL retornar todas as fases da temporada ordenadas pelo campo ordem
4. WHEN uma requisição de busca de fase por ID é recebida, THE FaseService SHALL retornar a fase correspondente ou lançar FaseNaoEncontradaError com status 404
5. THE FaseService SHALL validar que o campo tipo aceita apenas os valores PONTOS_CORRIDOS ou MATA_MATA
6. THE FaseService SHALL validar que o campo idaVolta é um booleano e só pode ser true quando tipo é MATA_MATA

### Requisito 2: Criação de Jogos

**User Story:** Como administrador, quero criar jogos dentro de uma fase, para registrar as partidas do campeonato.

#### Critérios de Aceitação

1. WHEN uma requisição de criação de jogo é recebida com faseId, timeCasaId, timeForaId e dataHora válidos, THE JogoService SHALL criar o Jogo com status AGENDADO e campos de placar como null
2. WHEN uma requisição de criação de jogo é recebida com timeCasaId igual a timeForaId, THE JogoService SHALL lançar um erro TimesIguaisError com status 400
3. WHEN uma requisição de criação de jogo é recebida com um faseId inexistente, THE JogoService SHALL lançar um erro FaseNaoEncontradaError com status 404
4. WHEN uma requisição de criação de jogo é recebida para uma fase MATA_MATA com idaVolta true, THE JogoService SHALL aceitar os campos grupoIdaVolta e ehJogoVolta
5. WHEN uma requisição de criação de jogo é recebida para uma fase PONTOS_CORRIDOS, THE JogoService SHALL ignorar os campos grupoIdaVolta e ehJogoVolta, definindo-os como null e false respectivamente
6. THE Sistema SHALL armazenar criadoPor com o ID do usuário autenticado que criou o jogo

### Requisito 3: Atualização de Jogos

**User Story:** Como administrador, quero atualizar dados de um jogo antes da finalização, para corrigir informações como data/hora e times.

#### Critérios de Aceitação

1. WHEN uma requisição de atualização é recebida para um jogo com status AGENDADO ou EM_ANDAMENTO, THE JogoService SHALL atualizar os campos permitidos (dataHora, timeCasaId, timeForaId, status)
2. WHEN uma requisição de atualização é recebida para um jogo com status FINALIZADO, THE JogoService SHALL lançar um erro JogoFinalizadoError com status 400
3. WHEN uma requisição de atualização é recebida para um jogo com status CANCELADO, THE JogoService SHALL lançar um erro JogoCanceladoError com status 400
4. WHEN uma requisição de atualização altera timeCasaId ou timeForaId, THE JogoService SHALL validar que os dois times continuam diferentes
5. WHEN uma requisição de atualização é recebida para um jogo inexistente, THE JogoService SHALL lançar um erro JogoNaoEncontradoError com status 404

### Requisito 4: Finalização de Jogos — Pontos Corridos

**User Story:** Como administrador, quero finalizar um jogo de pontos corridos informando o placar, para registrar o resultado da partida.

#### Critérios de Aceitação

1. WHEN uma requisição de finalização é recebida para um jogo de fase PONTOS_CORRIDOS com golsCasa e golsFora válidos, THE JogoService SHALL definir o status como FINALIZADO e registrar o placar
2. WHEN uma requisição de finalização de jogo PONTOS_CORRIDOS inclui campos de prorrogação ou pênaltis, THE JogoService SHALL lançar um erro ProrrogacaoNaoPermitidaError com status 400
3. WHEN um jogo de PONTOS_CORRIDOS é finalizado com golsCasa diferente de golsFora, THE JogoService SHALL definir vencedorId como o ID do time com mais gols
4. WHEN um jogo de PONTOS_CORRIDOS é finalizado com golsCasa igual a golsFora, THE JogoService SHALL definir vencedorId como null (empate)
5. WHEN uma requisição de finalização é recebida com golsCasa ou golsFora negativos, THE JogoService SHALL lançar um erro PlacarInvalidoError com status 400

### Requisito 5: Finalização de Jogos — Mata-Mata

**User Story:** Como administrador, quero finalizar um jogo de mata-mata com suporte a prorrogação e pênaltis, para definir o vencedor da eliminatória.

#### Critérios de Aceitação

1. WHEN uma requisição de finalização é recebida para um jogo de fase MATA_MATA com golsCasa e golsFora válidos e sem empate, THE JogoService SHALL definir o status como FINALIZADO, registrar o placar e definir vencedorId como o time com mais gols
2. WHEN uma requisição de finalização de jogo MATA_MATA apresenta empate no tempo normal e temProrrogacao é true, THE JogoService SHALL exigir golsProrrogacaoCasa e golsProrrogacaoFora
3. WHEN uma requisição de finalização de jogo MATA_MATA apresenta empate no tempo normal e temProrrogacao é false, THE JogoService SHALL lançar um erro VencedorObrigatorioError com status 400 (empate sem desempate em mata-mata)
4. WHEN uma requisição de finalização de jogo MATA_MATA apresenta empate após prorrogação e temPenaltis é true, THE JogoService SHALL exigir penaltisCasa e penaltisFora
5. WHEN uma requisição de finalização de jogo MATA_MATA apresenta empate após prorrogação e temPenaltis é false, THE JogoService SHALL lançar um erro VencedorObrigatorioError com status 400
6. WHEN um jogo MATA_MATA é finalizado, THE JogoService SHALL definir vencedorId como o ID do time vencedor, que deve ser timeCasaId ou timeForaId
7. WHEN uma requisição de finalização de jogo MATA_MATA informa prorrogação sem empate no tempo normal, THE JogoService SHALL lançar um erro ProrrogacaoNaoPermitidaError com status 400
8. WHEN uma requisição de finalização de jogo MATA_MATA informa pênaltis sem empate na prorrogação, THE JogoService SHALL lançar um erro PenaltisNaoPermitidoError com status 400
9. WHEN penaltisCasa é igual a penaltisFora, THE JogoService SHALL lançar um erro PlacarPenaltisEmpatadoError com status 400


### Requisito 6: Jogos de Ida e Volta

**User Story:** Como administrador, quero gerenciar jogos de ida e volta em fases mata-mata, para que o resultado do confronto considere o placar agregado.

#### Critérios de Aceitação

1. WHEN dois jogos possuem o mesmo grupoIdaVolta, THE Sistema SHALL tratá-los como um confronto de ida e volta
2. WHEN um jogo é criado com ehJogoVolta true, THE JogoService SHALL validar que a fase possui idaVolta habilitado
3. WHEN um jogo é criado com ehJogoVolta true, THE JogoService SHALL validar que existe um jogo de ida com o mesmo grupoIdaVolta
4. THE JogoService SHALL permitir prorrogação e pênaltis apenas em jogos de volta (ehJogoVolta = true) dentro de confrontos ida e volta
5. WHEN um jogo de ida é finalizado em fase com idaVolta, THE JogoService SHALL registrar o placar sem definir vencedorId (decisão fica para o jogo de volta)

### Requisito 7: Cálculo de Vencedor

**User Story:** Como sistema, quero calcular automaticamente o vencedor de um jogo, para garantir integridade dos resultados.

#### Critérios de Aceitação

1. WHEN um jogo de PONTOS_CORRIDOS é finalizado, THE JogoService SHALL calcular o vencedor comparando golsCasa e golsFora, retornando null em caso de empate
2. WHEN um jogo de MATA_MATA sem ida e volta é finalizado, THE JogoService SHALL calcular o vencedor verificando tempo normal, depois prorrogação, depois pênaltis, nessa ordem
3. WHEN um jogo de volta é finalizado, THE JogoService SHALL calcular o vencedor pelo placar agregado dos dois jogos (ida + volta), usando prorrogação e pênaltis do jogo de volta em caso de empate agregado
4. THE JogoService SHALL garantir que vencedorId é sempre timeCasaId ou timeForaId quando definido
5. WHEN o método calcularVencedor é chamado para um jogo não finalizado, THE JogoService SHALL retornar null

### Requisito 8: Consulta de Jogos

**User Story:** Como usuário, quero consultar jogos por fase, para acompanhar as partidas do campeonato.

#### Critérios de Aceitação

1. WHEN uma requisição de listagem de jogos é recebida com um faseId válido, THE JogoService SHALL retornar todos os jogos da fase ordenados por dataHora
2. WHEN uma requisição de busca de jogo por ID é recebida, THE JogoService SHALL retornar o jogo correspondente ou lançar JogoNaoEncontradoError com status 404
3. THE Sistema SHALL transformar os jogos retornados usando JogoPresenter.toHttp() com seleção positiva de campos
4. THE Sistema SHALL transformar as fases retornadas usando FasePresenter.toHttp() com seleção positiva de campos

### Requisito 9: Validações de Integridade

**User Story:** Como sistema, quero garantir a integridade dos dados de jogos, para evitar estados inconsistentes.

#### Critérios de Aceitação

1. THE JogoService SHALL garantir que golsCasa e golsFora são inteiros não negativos quando informados
2. THE JogoService SHALL garantir que golsProrrogacaoCasa e golsProrrogacaoFora são inteiros não negativos quando informados
3. THE JogoService SHALL garantir que penaltisCasa e penaltisFora são inteiros não negativos quando informados
4. WHEN temProrrogacao é false, THE JogoService SHALL garantir que golsProrrogacaoCasa e golsProrrogacaoFora são null
5. WHEN temPenaltis é false, THE JogoService SHALL garantir que penaltisCasa e penaltisFora são null
6. WHEN um jogo possui status diferente de FINALIZADO, THE JogoService SHALL garantir que todos os campos de placar permanecem null
7. THE JogoService SHALL validar que vencedorId, quando definido, corresponde a timeCasaId ou timeForaId do jogo

### Requisito 10: Transições de Status

**User Story:** Como administrador, quero que as transições de status dos jogos sigam regras claras, para manter a consistência dos dados.

#### Critérios de Aceitação

1. WHEN um jogo é criado, THE JogoService SHALL definir o status como AGENDADO
2. WHEN uma requisição de alteração de status é recebida, THE JogoService SHALL permitir apenas as transições: AGENDADO → EM_ANDAMENTO, AGENDADO → CANCELADO, EM_ANDAMENTO → FINALIZADO, EM_ANDAMENTO → CANCELADO
3. WHEN uma transição de status inválida é solicitada, THE JogoService SHALL lançar um erro TransicaoStatusInvalidaError com status 400
4. WHEN um jogo é transicionado para CANCELADO, THE JogoService SHALL bloquear qualquer alteração posterior no jogo

### Requisito 11: Modelo de Dados para Integração com API-Football

**User Story:** Como desenvolvedor, quero que o modelo de dados suporte integração com a API-Football, para rastrear a origem dos jogos e proteger edições manuais.

#### Critérios de Aceitação

1. THE Sistema SHALL incluir o campo externoId (nullable, string) na entidade Jogo para armazenar o fixture ID da API-Football
2. THE Sistema SHALL incluir o campo fonteResultado (enum: MANUAL, API_FOOTBALL) na entidade Jogo, com valor padrão MANUAL
3. WHEN um jogo é criado manualmente, THE JogoService SHALL definir fonteResultado como MANUAL
4. WHEN um jogo é importado da API-Football, THE JogoService SHALL definir fonteResultado como API_FOOTBALL e armazenar o fixture ID em externoId
5. THE Sistema SHALL garantir unicidade do campo externoId quando preenchido, impedindo duplicação de jogos importados

### Requisito 12: Importação de Jogos via API-Football

**User Story:** Como administrador, quero importar jogos de uma temporada/liga da API-Football, para não precisar cadastrar cada jogo manualmente.

#### Critérios de Aceitação

1. WHEN uma requisição de importação é recebida com leagueId e season válidos, THE ApiFootballService SHALL consultar o endpoint GET /fixtures?league={leagueId}&season={season} da API-Football via RapidAPI
2. WHEN a API-Football retorna fixtures, THE JogoService SHALL criar jogos na fase correspondente com os dados mapeados: times, dataHora, status e externoId
3. WHEN a API-Football retorna um fixture com status NS, THE JogoService SHALL criar o jogo com status AGENDADO
4. WHEN a API-Football retorna um fixture com status 1H, 2H ou HT, THE JogoService SHALL criar o jogo com status EM_ANDAMENTO
5. WHEN a API-Football retorna um fixture com status FT, AET ou PEN, THE JogoService SHALL criar o jogo com status FINALIZADO e registrar o placar
6. WHEN a API-Football retorna um fixture com status CANC ou PST, THE JogoService SHALL criar o jogo com status CANCELADO
7. WHEN um fixture já foi importado anteriormente (externoId já existe), THE JogoService SHALL ignorar o fixture duplicado durante a importação
8. IF a API-Football retorna erro ou está indisponível, THEN THE ApiFootballService SHALL lançar um erro ApiFootballIndisponivelError com status 502
9. THE ApiFootballService SHALL suportar as ligas Brasileirão Série A (leagueId 71) e Copa do Mundo (leagueId 1)
10. WHEN uma requisição de importação é recebida, THE Sistema SHALL exigir que o usuário autenticado possua perfil SUPER_ADMIN

### Requisito 13: Sincronização de Placares via API-Football

**User Story:** Como administrador, quero sincronizar placares de jogos importados com a API-Football, para manter os resultados atualizados automaticamente.

#### Critérios de Aceitação

1. WHEN uma requisição de sincronização de placares é recebida para uma fase, THE ApiFootballService SHALL consultar a API-Football para obter os placares atualizados dos jogos com externoId preenchido
2. WHEN a API-Football retorna placar atualizado para um jogo com fonteResultado API_FOOTBALL, THE JogoService SHALL atualizar o status e o placar do jogo
3. WHEN a API-Football retorna placar atualizado para um jogo com fonteResultado MANUAL, THE JogoService SHALL ignorar a atualização, preservando os dados editados manualmente
4. WHEN a sincronização atualiza o status de um jogo para FINALIZADO, THE JogoService SHALL calcular e definir o vencedorId conforme as regras do Requisito 7
5. IF a API-Football retorna dados inconsistentes (fixture ID não encontrado), THEN THE ApiFootballService SHALL registrar um log de aviso e prosseguir com os demais jogos
6. WHEN uma requisição de sincronização é recebida, THE Sistema SHALL exigir que o usuário autenticado possua perfil SUPER_ADMIN
7. THE ApiFootballService SHALL respeitar o limite de 100 requisições por dia do plano gratuito da RapidAPI

### Requisito 14: Modo Híbrido Manual/API

**User Story:** Como administrador, quero poder alternar entre criação manual e importação via API para os jogos, para ter flexibilidade no gerenciamento dos dados.

#### Critérios de Aceitação

1. WHEN um administrador edita manualmente o placar de um jogo importado (fonteResultado API_FOOTBALL), THE JogoService SHALL alterar fonteResultado para MANUAL, protegendo o jogo de sobrescrita em sincronizações futuras
2. WHEN um administrador cria um jogo manualmente em uma fase que contém jogos importados, THE JogoService SHALL criar o jogo com fonteResultado MANUAL sem afetar os jogos importados existentes
3. THE JogoService SHALL permitir que uma mesma fase contenha jogos com fonteResultado MANUAL e API_FOOTBALL simultaneamente
4. WHEN uma requisição de listagem de jogos é recebida, THE JogoPresenter SHALL incluir o campo fonteResultado na resposta para identificar a origem de cada jogo
5. WHEN um administrador deseja forçar a re-sincronização de um jogo editado manualmente, THE JogoService SHALL disponibilizar um endpoint para redefinir fonteResultado de MANUAL para API_FOOTBALL

### Requisito 15: Definição Híbrida de Status (API + Fallback)

**User Story:** Como sistema, quero definir o status do jogo priorizando dados da API externa e usando cálculo interno como fallback, para garantir consistência mesmo quando a API falhar.

#### Critérios de Aceitação

1. THE JogoService SHALL implementar método `definirStatusFinal(jogo, statusApi?)` que retorna o StatusJogo correto
2. WHEN o jogo já possui status FINALIZADO, THE método definirStatusFinal SHALL retornar FINALIZADO independentemente do statusApi recebido (nunca regredir)
3. WHEN statusApi é fornecido e o jogo não está FINALIZADO, THE método definirStatusFinal SHALL mapear o status da API usando mapearStatus() e retorná-lo
4. WHEN statusApi não é fornecido (API falhou ou indisponível), THE método definirStatusFinal SHALL calcular o status internamente usando calcularStatusInterno()
5. THE método calcularStatusInterno SHALL retornar AGENDADO se a data atual é anterior a dataHora do jogo
6. THE método calcularStatusInterno SHALL retornar EM_ANDAMENTO se a data atual está entre dataHora e dataHora + 2 horas
7. THE método calcularStatusInterno SHALL retornar FINALIZADO se a data atual é posterior a dataHora + 2 horas (estimativa)
8. THE método mapearStatus SHALL mapear: SCHEDULED→AGENDADO, LIVE/IN_PLAY→EM_ANDAMENTO, FINISHED→FINALIZADO, CANCELLED→CANCELADO, default→AGENDADO
9. WHEN a sincronização via cron é executada, THE JogoService SHALL usar definirStatusFinal() para cada jogo, passando o status da API quando disponível
10. THE JogoService SHALL garantir que nenhuma transição de status regride (FINALIZADO nunca volta para EM_ANDAMENTO ou AGENDADO)

### Requisito 16: Resiliência a Falhas de API

**User Story:** Como sistema, quero continuar operando normalmente quando a API externa falhar, para não depender 100% de serviços externos.

#### Critérios de Aceitação

1. WHEN a API-Football está indisponível durante sincronização, THE JogoService SHALL usar o fallback interno para atualizar status dos jogos
2. WHEN a API-Football retorna dados parciais (alguns fixtures sem status), THE JogoService SHALL usar fallback interno apenas para os jogos sem status da API
3. THE Sistema SHALL registrar log de aviso quando o fallback interno é utilizado
4. THE Sistema SHALL nunca bloquear operações do usuário por falha na API externa

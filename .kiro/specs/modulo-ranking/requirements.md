# Documento de Requisitos — Módulo de Ranking

## Introdução

Módulo responsável pelo cálculo de pontuação e classificação de usuários dentro de grupos de bolão. A pontuação é baseada na precisão dos palpites em relação ao resultado real dos jogos finalizados. Cada grupo possui seu próprio ranking independente, calculado a partir dos palpites universais dos membros filtrados pelo contexto do grupo. O módulo suporta rankings por fase (rodada ou etapa de mata-mata) e ranking geral (acumulado de todas as fases da temporada). Integra com o módulo de Palpites para obter os palpites e com o módulo de Jogos para obter os resultados reais. Também integra com a mecânica de Palpite Dobrado, aplicando o multiplicador 2x nos pontos quando o membro possui PalpiteDobrado ativo para o jogo no grupo. Ao final de cada fase, o módulo dispara a concessão de TokenDobro para o primeiro e último colocados do ranking da fase, e para acertos em cheio em jogos finalizados.

## Glossário

- **Sistema_Ranking**: Módulo backend responsável pelo cálculo de pontuação e classificação de membros dentro de grupos de bolão.
- **Pontuacao**: Valor numérico atribuído a um palpite com base na comparação entre o placar previsto e o placar real de um jogo finalizado.
- **Acerto_Em_Cheio**: Palpite cujo golsCasa e golsFora coincidem exatamente com o placar final do jogo (golsCasa do Palpite == golsCasa do Jogo E golsFora do Palpite == golsFora do Jogo). Concede a pontuação máxima.
- **Acerto_De_Resultado**: Palpite que acerta o resultado do jogo (vitória casa, vitória fora ou empate) sem acertar o placar exato. Concede pontuação intermediária.
- **Acerto_De_Gols_Um_Time**: Palpite que acerta a quantidade exata de gols de pelo menos um dos times, sem acertar o resultado. Concede pontuação mínima.
- **Erro_Total**: Palpite que não acerta o resultado nem a quantidade de gols de nenhum dos times. Concede zero pontos.
- **Ranking_Fase**: Classificação dos membros de um grupo ordenada pela pontuação acumulada nos jogos de uma fase específica (rodada ou etapa de mata-mata).
- **Ranking_Geral**: Classificação dos membros de um grupo ordenada pela pontuação acumulada em todos os jogos finalizados de todas as fases da temporada do grupo.
- **Multiplicador_Dobro**: Fator 2x aplicado à pontuação de um palpite quando o membro possui PalpiteDobrado ativo para o jogo no contexto do grupo.
- **Posicao**: Número ordinal que indica a classificação do membro no ranking, considerando empates (membros com mesma pontuação ocupam a mesma posição).
- **Fase_Encerrada**: Fase cujos jogos possuem todos status FINALIZADO ou CANCELADO.
- **Jogo_Finalizado**: Jogo cujo campo `status` possui valor `FINALIZADO`, indicando que o resultado final está disponível.
- **Membro_Grupo**: Usuário com registro ativo na tabela GrupoUsuario para um grupo específico, com role ADMIN ou MEMBER.
- **PontuacaoJogo**: Registro que armazena a pontuação calculada de um palpite para um jogo específico no contexto de um grupo, incluindo os pontos base, o multiplicador aplicado e os pontos finais.
- **RankingService**: Service responsável pela lógica de cálculo de pontuação e montagem de rankings.
- **PontuacaoService**: Service responsável pelo cálculo de pontos de um palpite individual comparado ao resultado real do jogo.
- **RankingController**: Controller responsável pelos endpoints de consulta de ranking e pontuação.

## Requisitos

### Requisito 1: Cálculo de Pontuação por Palpite

**User Story:** Como membro de um grupo, eu quero que meus palpites sejam pontuados automaticamente quando um jogo é finalizado, para que eu possa acompanhar meu desempenho.

#### Critérios de Aceitação

1. WHEN um Jogo_Finalizado possui placar registrado, THE PontuacaoService SHALL calcular a pontuação de cada palpite comparando golsCasa e golsFora do palpite com golsCasa e golsFora do jogo.
2. WHEN o golsCasa do palpite é igual ao golsCasa do jogo E o golsFora do palpite é igual ao golsFora do jogo, THE PontuacaoService SHALL classificar o palpite como Acerto_Em_Cheio e atribuir 10 pontos base.
3. WHEN o palpite acerta o resultado do jogo (vitória casa, vitória fora ou empate) sem acertar o placar exato, THE PontuacaoService SHALL classificar o palpite como Acerto_De_Resultado e atribuir 5 pontos base.
4. WHEN o palpite acerta a quantidade exata de gols de pelo menos um dos times sem acertar o resultado, THE PontuacaoService SHALL classificar o palpite como Acerto_De_Gols_Um_Time e atribuir 3 pontos base.
5. WHEN o palpite não se enquadra em nenhuma das categorias anteriores, THE PontuacaoService SHALL classificar o palpite como Erro_Total e atribuir 0 pontos base.
6. THE PontuacaoService SHALL aplicar as regras de pontuação de forma mutuamente exclusiva: cada palpite recebe a pontuação da categoria de maior valor na qual se enquadra (Acerto_Em_Cheio > Acerto_De_Resultado > Acerto_De_Gols_Um_Time > Erro_Total).
7. THE PontuacaoService SHALL considerar apenas o placar do tempo normal (golsCasa e golsFora do Jogo) para o cálculo de pontuação, ignorando prorrogação e pênaltis.

### Requisito 2: Aplicação do Multiplicador de Palpite Dobrado

**User Story:** Como membro de um grupo com palpite dobrado habilitado, eu quero que meus palpites dobrados valham o dobro de pontos, para que a mecânica de dobro impacte minha classificação.

#### Critérios de Aceitação

1. WHILE um grupo possui palpiteDobradoHabilitado ativo, WHEN o ranking do grupo é calculado e um Membro_Grupo possui PalpiteDobrado ativo para um Jogo_Finalizado, THE Sistema_Ranking SHALL multiplicar os pontos base do palpite por 2.
2. WHEN um Membro_Grupo não possui PalpiteDobrado ativo para um jogo, THE Sistema_Ranking SHALL aplicar multiplicador 1 aos pontos base do palpite.
3. THE Sistema_Ranking SHALL aplicar o Multiplicador_Dobro apenas no contexto do grupo onde o PalpiteDobrado foi ativado, sem afetar a pontuação do mesmo palpite em outros grupos.
4. WHEN o grupo não possui palpiteDobradoHabilitado ativo, THE Sistema_Ranking SHALL aplicar multiplicador 1 a todos os palpites, independentemente de registros de PalpiteDobrado existentes.

### Requisito 3: Ranking por Fase

**User Story:** Como membro de um grupo, eu quero ver o ranking da fase atual, para que eu possa acompanhar minha posição em relação aos outros membros na rodada.

#### Critérios de Aceitação

1. WHEN um Membro_Grupo solicita o ranking de uma fase específica dentro do grupo, THE RankingService SHALL retornar a lista de membros do grupo ordenada pela pontuação acumulada nos jogos finalizados daquela fase, em ordem decrescente de pontuação.
2. WHEN dois ou mais membros possuem a mesma pontuação no ranking da fase, THE RankingService SHALL atribuir a mesma posição a todos os membros empatados.
3. WHEN um Membro_Grupo não possui palpites para nenhum jogo finalizado da fase, THE RankingService SHALL incluir o membro no ranking com pontuação zero.
4. THE RankingService SHALL incluir no ranking da fase: posição, usuarioId, nome do usuário, pontuação total na fase, quantidade de acertos em cheio, quantidade de acertos de resultado, quantidade de acertos de gols de um time e quantidade de erros totais.
5. WHEN um Membro_Grupo solicita o ranking de uma fase inexistente, THE RankingService SHALL rejeitar a requisição com erro informando que a fase não foi encontrada.
6. WHEN um Membro_Grupo solicita o ranking de uma fase que não possui jogos finalizados, THE RankingService SHALL retornar o ranking com todos os membros com pontuação zero.

### Requisito 4: Ranking Geral da Temporada

**User Story:** Como membro de um grupo, eu quero ver o ranking geral acumulado de toda a temporada, para que eu possa acompanhar a classificação global do bolão.

#### Critérios de Aceitação

1. WHEN um Membro_Grupo solicita o ranking geral do grupo, THE RankingService SHALL retornar a lista de membros do grupo ordenada pela pontuação acumulada em todos os jogos finalizados de todas as fases da temporada do grupo, em ordem decrescente de pontuação.
2. WHEN dois ou mais membros possuem a mesma pontuação no ranking geral, THE RankingService SHALL atribuir a mesma posição a todos os membros empatados.
3. THE RankingService SHALL incluir no ranking geral: posição, usuarioId, nome do usuário, pontuação total, quantidade de acertos em cheio, quantidade de acertos de resultado, quantidade de acertos de gols de um time e quantidade de erros totais.
4. WHEN um Membro_Grupo solicita o ranking geral de um grupo inexistente, THE RankingService SHALL rejeitar a requisição com erro informando que o grupo não foi encontrado.

### Requisito 5: Detalhamento de Pontuação por Jogo

**User Story:** Como membro de um grupo, eu quero ver o detalhamento da pontuação de cada jogo, para que eu possa entender como meus pontos foram calculados.

#### Critérios de Aceitação

1. WHEN um Membro_Grupo solicita o detalhamento de pontuação de um jogo finalizado dentro do grupo, THE RankingService SHALL retornar a lista de membros com seus respectivos palpites, categoria de acerto, pontos base, multiplicador aplicado e pontos finais.
2. WHILE um jogo possui status diferente de FINALIZADO, WHEN um Membro_Grupo solicita o detalhamento de pontuação do jogo, THE RankingService SHALL retornar a lista sem pontuação calculada (pontos base e pontos finais como null).
3. WHEN um Membro_Grupo solicita o detalhamento de pontuação de um jogo inexistente, THE RankingService SHALL rejeitar a requisição com erro informando que o jogo não foi encontrado.
4. THE RankingService SHALL indicar quais palpites possuem PalpiteDobrado ativo no contexto do grupo, incluindo uma flag de dobro na resposta.
5. WHEN um membro do grupo não possui palpite para o jogo, THE RankingService SHALL incluir o membro na lista com palpite null e pontuação zero.

### Requisito 6: Concessão de TokenDobro por Acerto em Cheio

**User Story:** Como membro de um grupo com palpite dobrado habilitado, eu quero receber uma ficha de dobro quando acerto o placar exato de um jogo, para que eu seja recompensado pela precisão.

#### Critérios de Aceitação

1. WHILE um grupo possui palpiteDobradoHabilitado ativo, WHEN um jogo é finalizado e a pontuação é calculada, THE Sistema_Ranking SHALL identificar todos os membros do grupo cujo palpite é um Acerto_Em_Cheio e solicitar a concessão de 1 TokenDobro com motivo ACERTO_EM_CHEIO para cada membro, usando o jogoId como referenciaId.
2. WHEN um grupo não possui palpiteDobradoHabilitado ativo, THE Sistema_Ranking SHALL ignorar a concessão de TokenDobro por acerto em cheio.
3. THE Sistema_Ranking SHALL conceder no máximo 1 TokenDobro por acerto em cheio por membro por jogo por grupo, evitando duplicidade.

### Requisito 7: Concessão de TokenDobro por Posição no Ranking da Fase

**User Story:** Como membro de um grupo com palpite dobrado habilitado, eu quero receber fichas de dobro por terminar em primeiro ou último lugar no ranking da fase, para que haja incentivo competitivo.

#### Critérios de Aceitação

1. WHILE um grupo possui palpiteDobradoHabilitado ativo, WHEN todos os jogos de uma fase são finalizados ou cancelados (Fase_Encerrada), THE Sistema_Ranking SHALL identificar o membro na primeira posição do ranking da fase e solicitar a concessão de 1 TokenDobro com motivo PRIMEIRO_RANKING, usando o faseId como referenciaId.
2. WHILE um grupo possui palpiteDobradoHabilitado ativo, WHEN todos os jogos de uma fase são finalizados ou cancelados (Fase_Encerrada), THE Sistema_Ranking SHALL identificar o membro na última posição do ranking da fase e solicitar a concessão de 1 TokenDobro com motivo ULTIMO_RANKING, usando o faseId como referenciaId.
3. WHEN dois ou mais membros empatam na primeira posição do ranking da fase, THE Sistema_Ranking SHALL conceder TokenDobro com motivo PRIMEIRO_RANKING a todos os membros empatados na primeira posição.
4. WHEN dois ou mais membros empatam na última posição do ranking da fase, THE Sistema_Ranking SHALL conceder TokenDobro com motivo ULTIMO_RANKING a todos os membros empatados na última posição.
5. WHEN um grupo não possui palpiteDobradoHabilitado ativo, THE Sistema_Ranking SHALL ignorar a concessão de TokenDobro por posição no ranking.
6. THE Sistema_Ranking SHALL conceder no máximo 1 TokenDobro por motivo (PRIMEIRO_RANKING ou ULTIMO_RANKING) por membro por fase por grupo, evitando duplicidade.
7. WHEN uma fase possui apenas jogos cancelados (nenhum jogo finalizado), THE Sistema_Ranking SHALL ignorar a concessão de TokenDobro por posição, pois o ranking não possui dados significativos.

### Requisito 8: Concessão de TokenDobro por Palpites Completos na Fase

**User Story:** Como membro de um grupo com palpite dobrado habilitado, eu quero receber uma ficha de dobro quando completo todos os palpites de uma fase antes do primeiro jogo começar, para que eu seja recompensado pela dedicação.

#### Critérios de Aceitação

1. WHILE um grupo possui palpiteDobradoHabilitado ativo, WHEN um Membro_Grupo possui palpites registrados para todos os jogos de uma fase antes do dataHora do primeiro jogo daquela fase, THE Sistema_Ranking SHALL solicitar a concessão de 1 TokenDobro com motivo PALPITES_COMPLETOS, usando o faseId como referenciaId.
2. WHEN um grupo não possui palpiteDobradoHabilitado ativo, THE Sistema_Ranking SHALL ignorar a concessão de TokenDobro por palpites completos.
3. THE Sistema_Ranking SHALL conceder no máximo 1 TokenDobro por motivo PALPITES_COMPLETOS por membro por fase por grupo, evitando duplicidade.
4. THE Sistema_Ranking SHALL considerar apenas jogos com status diferente de CANCELADO ao verificar se todos os palpites da fase foram registrados.

### Requisito 9: Processamento de Pontuação ao Finalizar Jogo

**User Story:** Como sistema, eu quero processar a pontuação automaticamente quando um jogo é finalizado, para que o ranking esteja sempre atualizado.

#### Critérios de Aceitação

1. WHEN um jogo transiciona para status FINALIZADO, THE Sistema_Ranking SHALL calcular a pontuação de todos os palpites dos membros de todos os grupos que possuem a temporada do jogo, para o jogo finalizado.
2. WHEN a pontuação de um jogo é calculada para um grupo, THE Sistema_Ranking SHALL verificar e conceder TokenDobro por acerto em cheio conforme Requisito 6.
3. WHEN a pontuação de um jogo é calculada e o jogo é o último jogo pendente de uma fase, THE Sistema_Ranking SHALL verificar se a fase está encerrada e, em caso positivo, conceder TokenDobro por posição no ranking conforme Requisito 7.
4. IF ocorre um erro durante o processamento de pontuação de um grupo, THEN THE Sistema_Ranking SHALL registrar log de erro e continuar o processamento para os demais grupos, sem propagar a exceção.
5. THE Sistema_Ranking SHALL processar a pontuação de forma idempotente: recalcular a pontuação de um jogo já processado deve produzir o mesmo resultado sem duplicar registros de TokenDobro.

### Requisito 10: Consulta de Ranking via API

**User Story:** Como consumidor da API, eu quero endpoints para consultar rankings e pontuações, para que o frontend possa exibir as classificações.

#### Critérios de Aceitação

1. WHEN um Membro_Grupo solicita o ranking geral do grupo via endpoint GET, THE RankingController SHALL retornar o ranking geral conforme Requisito 4.
2. WHEN um Membro_Grupo solicita o ranking de uma fase via endpoint GET, THE RankingController SHALL retornar o ranking da fase conforme Requisito 3.
3. WHEN um Membro_Grupo solicita o detalhamento de pontuação de um jogo via endpoint GET, THE RankingController SHALL retornar o detalhamento conforme Requisito 5.
4. WHEN um usuário autenticado que não é membro do grupo tenta consultar o ranking, THE RankingController SHALL rejeitar a requisição com erro de permissão.
5. THE RankingController SHALL exigir autenticação JWT para todos os endpoints de ranking.

### Requisito 11: Transformação de Resposta via Presenter

**User Story:** Como consumidor da API, eu quero receber respostas padronizadas e consistentes para dados de ranking, para que a integração com o frontend seja previsível.

#### Critérios de Aceitação

1. THE Sistema_Ranking SHALL transformar todas as respostas de ranking através de um RankingPresenter com método estático toHttp, utilizando seleção positiva (allowlist) de campos.
2. THE Sistema_Ranking SHALL incluir nos dados de resposta do ranking: posição, usuarioId, nomeUsuario, pontuacaoTotal, acertosEmCheio, acertosDeResultado, acertosDeGolsUmTime e errosTotais.
3. THE Sistema_Ranking SHALL transformar todas as respostas de detalhamento de pontuação por jogo através de um PontuacaoJogoPresenter com método estático toHttp, incluindo: usuarioId, nomeUsuario, golsCasaPalpite, golsForaPalpite, categoriaAcerto, pontosBase, multiplicador, pontosFinais e dobrado (flag booleana).

### Requisito 12: Critérios de Desempate no Ranking

**User Story:** Como membro de um grupo, eu quero que o ranking tenha critérios de desempate claros, para que a classificação seja justa quando houver empate de pontuação.

#### Critérios de Aceitação

1. WHEN dois ou mais membros possuem a mesma pontuação total, THE RankingService SHALL aplicar o primeiro critério de desempate: maior quantidade de acertos em cheio.
2. WHEN o primeiro critério de desempate não resolve o empate, THE RankingService SHALL aplicar o segundo critério: maior quantidade de acertos de resultado.
3. WHEN o segundo critério de desempate não resolve o empate, THE RankingService SHALL manter os membros na mesma posição, ordenados alfabeticamente pelo nome do usuário.
4. THE RankingService SHALL aplicar os critérios de desempate de forma consistente tanto no ranking por fase quanto no ranking geral.

### Requisito 13: Membros sem Palpite em Jogos Finalizados

**User Story:** Como sistema, eu quero tratar corretamente membros que não fizeram palpite para um jogo, para que o ranking reflita a ausência de participação.

#### Critérios de Aceitação

1. WHEN um Membro_Grupo não possui palpite registrado para um Jogo_Finalizado, THE PontuacaoService SHALL atribuir 0 pontos ao membro para aquele jogo.
2. WHEN um Membro_Grupo não possui palpite para um jogo e possui PalpiteDobrado ativo para o mesmo jogo no grupo, THE Sistema_Ranking SHALL aplicar o multiplicador sobre 0 pontos, resultando em 0 pontos finais.
3. THE Sistema_Ranking SHALL diferenciar na resposta entre "membro sem palpite" (palpite null) e "membro com palpite que errou tudo" (Erro_Total com 0 pontos).

### Requisito 14: Jogos Cancelados e Adiados no Ranking

**User Story:** Como sistema, eu quero que jogos cancelados e adiados sejam tratados corretamente no ranking, para que não distorçam a classificação.

#### Critérios de Aceitação

1. WHEN um jogo possui status CANCELADO, THE Sistema_Ranking SHALL excluir o jogo do cálculo de pontuação e ranking.
2. WHEN um jogo é cancelado e o membro possuía PalpiteDobrado ativo para o jogo, THE Sistema_Ranking SHALL ignorar o PalpiteDobrado no cálculo, sem devolver o TokenDobro automaticamente.
3. THE Sistema_Ranking SHALL considerar apenas jogos com status FINALIZADO para o cálculo de pontuação e ranking.
4. WHEN um jogo é adiado (status PST na API-Football), THE Sistema SHALL tratar o jogo como AGENDADO com nova dataHora, preservando todos os palpites e PalpiteDobrado existentes. O jogo entrará no ranking normalmente quando for finalizado.
5. WHEN um jogo adiado recebe nova dataHora, THE Sistema SHALL manter o status AGENDADO, permitindo que membros continuem editando palpites e ativando/desativando PalpiteDobrado.
6. THE Sistema SHALL alterar o mapeamento de status da API-Football para que `PST` (Postponed) mapeie para `AGENDADO` em vez de `CANCELADO`, pois um jogo adiado será reagendado e deve permanecer elegível para palpites e ranking. Essa mudança é necessária no método `mapearStatusApiFootball` do JogoService (módulo Jogos) para evitar que jogos adiados sejam excluídos permanentemente do ranking da rodada/etapa.


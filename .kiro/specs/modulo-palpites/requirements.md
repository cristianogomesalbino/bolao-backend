# Documento de Requisitos — Módulo Palpites

## Introdução

O módulo Palpites permite que usuários autenticados façam palpites (previsões de placar) em jogos de uma temporada. O palpite é universal: pertence ao usuário e ao jogo, independente de grupo. Cada palpite contém a previsão de gols do time da casa e do time visitante. A unicidade é (usuarioId, jogoId) — um único palpite por usuário por jogo, que vale para todos os grupos dos quais o usuário participa. O módulo garante que palpites só possam ser criados ou editados enquanto o jogo estiver com status AGENDADO. A conexão com grupos é indireta: ao listar palpites dentro de um grupo, o sistema filtra pelos usuários que são membros daquele grupo.

O módulo também inclui a mecânica de Palpite Dobrado: uma funcionalidade opcional por grupo que permite aos usuários acumular fichas de dobro (Token_Dobro) através de conquistas e utilizá-las para multiplicar por 2x os pontos de um palpite específico no contexto de um grupo. As fichas são acumuladas por grupo (cada grupo possui saldo independente por usuário), e o usuário escolhe deliberadamente em qual jogo aplicar o dobro antes do jogo começar. O mesmo palpite pode ser dobrado em um grupo e não em outro, pois a ativação do dobro é vinculada ao contexto do grupo, não ao palpite em si.

## Glossário

- **Sistema_Palpites**: Módulo backend responsável pelo gerenciamento de palpites universais de jogos.
- **Palpite**: Registro contendo a previsão de placar (golsCasa, golsFora) de um usuário para um jogo específico. Não possui vínculo direto com grupo.
- **Usuário_Autenticado**: Usuário com sessão JWT válida no sistema.
- **Usuário_Membro**: Usuário autenticado que possui registro ativo na tabela GrupoUsuario para um grupo específico. Relevante apenas para operações de listagem/visualização em contexto de grupo.
- **Jogo_Agendado**: Jogo cujo campo `status` possui valor `AGENDADO`, indicando que ainda não começou.
- **Grupo**: Grupo de bolão vinculado a uma temporada, onde membros compartilham e comparam palpites.
- **GrupoUsuario**: Registro de associação entre um usuário e um grupo, contendo a role (ADMIN ou MEMBER).
- **Token_Dobro**: Ficha virtual acumulada por um usuário dentro de um grupo específico, que pode ser gasta para dobrar os pontos de um palpite. O saldo é independente por grupo.
- **Palpite_Dobrado**: Registro que vincula um Token_Dobro a um jogo específico dentro de um grupo, indicando que o palpite do usuário para aquele jogo terá pontuação multiplicada por 2x no ranking do grupo.
- **Grupo_Com_Dobro**: Grupo que possui a configuração `palpiteDobradoHabilitado` ativa, permitindo o uso da mecânica de Palpite Dobrado pelos membros.
- **Fase_Encerrada**: Fase (rodada ou etapa de mata-mata) cujos jogos possuem todos status FINALIZADO ou CANCELADO, indicando que a fase foi concluída.
- **Acerto_Em_Cheio**: Palpite cujo golsCasa e golsFora coincidem exatamente com o placar final do jogo.

## Requisitos

### Requisito 1: Criar Palpite

**User Story:** Como um usuário autenticado, eu quero registrar meu palpite para um jogo, para que eu possa participar dos bolões.

#### Critérios de Aceitação

1. WHEN um Usuário_Autenticado envia um palpite com golsCasa e golsFora válidos para um Jogo_Agendado, THE Sistema_Palpites SHALL criar o Palpite associado ao usuário e ao jogo, e retornar os dados do palpite criado.
2. WHEN um Usuário_Autenticado tenta criar um palpite para um jogo cujo status é diferente de AGENDADO, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o jogo não aceita mais palpites.
3. WHEN um Usuário_Autenticado tenta criar um palpite para um jogo no qual já possui palpite registrado, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que já existe um palpite para este jogo.
4. WHEN um Usuário_Autenticado envia golsCasa ou golsFora com valor negativo ou não inteiro, THE Sistema_Palpites SHALL rejeitar a requisição com erro de validação.
5. WHEN um Usuário_Autenticado tenta criar um palpite para um jogo inexistente, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o jogo não foi encontrado.

### Requisito 2: Editar Palpite

**User Story:** Como um usuário autenticado, eu quero editar meu palpite existente, para que eu possa corrigir minha previsão antes do jogo começar.

#### Critérios de Aceitação

1. WHEN um Usuário_Autenticado envia uma atualização de palpite com novos valores de golsCasa e golsFora para um Jogo_Agendado, THE Sistema_Palpites SHALL atualizar o Palpite existente e retornar os dados atualizados.
2. WHEN um Usuário_Autenticado tenta editar um palpite cujo jogo possui status diferente de AGENDADO, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o jogo não aceita mais alterações de palpite.
3. WHEN um Usuário_Autenticado tenta editar um palpite que pertence a outro usuário, THE Sistema_Palpites SHALL rejeitar a requisição com erro de permissão.
4. WHEN um Usuário_Autenticado tenta editar um palpite inexistente, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o palpite não foi encontrado.

### Requisito 3: Excluir Palpite

**User Story:** Como um usuário autenticado, eu quero excluir meu palpite, para que eu possa desistir de uma previsão antes do jogo começar.

#### Critérios de Aceitação

1. WHEN um Usuário_Autenticado solicita a exclusão de um palpite próprio para um Jogo_Agendado, THE Sistema_Palpites SHALL remover o Palpite e retornar mensagem de confirmação.
2. WHEN um Usuário_Autenticado tenta excluir um palpite cujo jogo possui status diferente de AGENDADO, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o jogo não aceita mais alterações de palpite.
3. WHEN um Usuário_Autenticado tenta excluir um palpite que pertence a outro usuário, THE Sistema_Palpites SHALL rejeitar a requisição com erro de permissão.
4. WHEN um Usuário_Autenticado tenta excluir um palpite inexistente, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o palpite não foi encontrado.

### Requisito 4: Buscar Meu Palpite por Jogo

**User Story:** Como um usuário autenticado, eu quero visualizar meu palpite para um jogo específico, para que eu possa conferir minha previsão.

#### Critérios de Aceitação

1. WHEN um Usuário_Autenticado solicita seu palpite para um jogo específico, THE Sistema_Palpites SHALL retornar os dados do palpite incluindo golsCasa, golsFora e dados do jogo.
2. WHEN um Usuário_Autenticado solicita seu palpite para um jogo no qual não possui palpite registrado, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o palpite não foi encontrado.
3. WHEN um Usuário_Autenticado solicita seu palpite para um jogo inexistente, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o jogo não foi encontrado.

### Requisito 5: Listar Palpites por Jogo no Contexto de Grupo

**User Story:** Como um membro de grupo, eu quero ver os palpites de um jogo dentro do meu grupo, para que eu possa comparar previsões com outros membros.

#### Critérios de Aceitação

1. WHILE um jogo possui status FINALIZADO, WHEN um Usuário_Membro solicita a lista de palpites do jogo dentro do grupo, THE Sistema_Palpites SHALL retornar os palpites de todos os membros do grupo para o jogo solicitado, incluindo dados do usuário.
2. WHILE um jogo possui status AGENDADO ou EM_ANDAMENTO, WHEN um Usuário_Membro solicita a lista de palpites do jogo dentro do grupo, THE Sistema_Palpites SHALL retornar apenas o palpite do próprio usuário solicitante.
3. WHEN um Usuário_Membro solicita palpites de um jogo inexistente, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o jogo não foi encontrado.
4. WHEN um usuário autenticado que não é membro do grupo tenta listar palpites do grupo, THE Sistema_Palpites SHALL rejeitar a requisição com erro de permissão.

### Requisito 6: Listar Meus Palpites

**User Story:** Como um usuário autenticado, eu quero ver todos os meus palpites, para que eu possa acompanhar minhas previsões.

#### Critérios de Aceitação

1. WHEN um Usuário_Autenticado solicita a lista dos próprios palpites, THE Sistema_Palpites SHALL retornar todos os palpites do usuário, incluindo dados do jogo associado.
2. WHERE o parâmetro de filtro por temporadaId é fornecido, THE Sistema_Palpites SHALL retornar apenas os palpites do usuário para jogos da temporada especificada.

### Requisito 7: Unicidade de Palpite Universal

**User Story:** Como operador do sistema, eu quero garantir que cada usuário tenha no máximo um palpite por jogo, para que a integridade dos dados seja mantida em todos os grupos.

#### Critérios de Aceitação

1. THE Sistema_Palpites SHALL garantir a constraint de unicidade na combinação (usuarioId, jogoId) no banco de dados.
2. IF uma tentativa de inserção viola a constraint de unicidade, THEN THE Sistema_Palpites SHALL retornar erro informando que já existe um palpite para este jogo.

### Requisito 8: Transformação de Resposta via Presenter

**User Story:** Como consumidor da API, eu quero receber respostas padronizadas e consistentes, para que a integração com o frontend seja previsível.

#### Critérios de Aceitação

1. THE Sistema_Palpites SHALL transformar todas as respostas de palpite através de um PalpitePresenter com método estático toHttp, utilizando seleção positiva (allowlist) de campos.
2. THE Sistema_Palpites SHALL incluir nos dados de resposta: id, golsCasa, golsFora, jogoId, usuarioId e dataCriacao.


### Requisito 9: Configuração de Palpite Dobrado no Grupo

**User Story:** Como administrador de um grupo, eu quero habilitar ou desabilitar a mecânica de palpite dobrado no meu grupo, para que eu possa escolher se o grupo utiliza essa funcionalidade.

#### Critérios de Aceitação

1. WHEN um Usuário_Membro com role ADMIN atualiza a configuração de palpite dobrado de um grupo, THE Sistema_Palpites SHALL persistir o campo `palpiteDobradoHabilitado` no registro do Grupo.
2. THE Sistema_Palpites SHALL definir o valor padrão de `palpiteDobradoHabilitado` como `false` para novos grupos.
3. WHEN um Usuário_Membro com role MEMBER tenta alterar a configuração de palpite dobrado, THE Sistema_Palpites SHALL rejeitar a requisição com erro de permissão.
4. WHEN a configuração de palpite dobrado é desabilitada em um Grupo_Com_Dobro, THE Sistema_Palpites SHALL manter os Token_Dobro existentes dos membros, porém impedir novas ativações de dobro em jogos.

### Requisito 10: Concessão de Token de Dobro por Conquista

**User Story:** Como membro de um grupo com palpite dobrado habilitado, eu quero receber fichas de dobro ao atingir conquistas, para que eu possa usá-las estrategicamente.

As conquistas são avaliadas por Fase (model `Fase` no Prisma), que representa tanto uma rodada (em campeonatos de pontos corridos) quanto uma etapa de mata-mata (quartas de final, semifinal, etc.). Cada Fase possui `tipo: TipoFase` e agrupa um conjunto de jogos.

#### Critérios de Aceitação

1. WHILE um Grupo_Com_Dobro possui palpite dobrado habilitado, WHEN um Usuário_Membro registra palpites para todos os jogos de uma Fase (rodada ou etapa de mata-mata) antes do `dataHora` do primeiro jogo daquela Fase, THE Sistema_Palpites SHALL conceder 1 Token_Dobro ao usuário naquele grupo.
2. WHILE um Grupo_Com_Dobro possui palpite dobrado habilitado, WHEN um jogo é finalizado e o palpite de um Usuário_Membro é um Acerto_Em_Cheio, THE Sistema_Palpites SHALL conceder 1 Token_Dobro ao usuário naquele grupo.
3. WHILE um Grupo_Com_Dobro possui palpite dobrado habilitado, WHEN todos os jogos de uma Fase são finalizados (Fase_Encerrada) e um Usuário_Membro ocupa a última posição no ranking do grupo para aquela Fase, THE Sistema_Palpites SHALL conceder 1 Token_Dobro ao usuário naquele grupo.
4. WHILE um Grupo_Com_Dobro possui palpite dobrado habilitado, WHEN todos os jogos de uma Fase são finalizados (Fase_Encerrada) e um Usuário_Membro ocupa a primeira posição no ranking do grupo para aquela Fase, THE Sistema_Palpites SHALL conceder 1 Token_Dobro ao usuário naquele grupo.
5. THE Sistema_Palpites SHALL registrar cada concessão de Token_Dobro com o motivo da conquista (PALPITES_COMPLETOS, ACERTO_EM_CHEIO, ULTIMO_RANKING, PRIMEIRO_RANKING), o usuário, o grupo e a referência ao contexto (faseId ou jogoId).
6. THE Sistema_Palpites SHALL permitir acúmulo ilimitado de Token_Dobro por usuário por grupo.
7. WHEN um grupo não possui palpite dobrado habilitado, THE Sistema_Palpites SHALL ignorar todas as regras de concessão de Token_Dobro para membros daquele grupo.

### Requisito 11: Ativar Palpite Dobrado em um Jogo

**User Story:** Como membro de um grupo com palpite dobrado habilitado, eu quero usar uma ficha de dobro em um jogo específico, para que meu palpite valha o dobro de pontos no ranking do grupo.

#### Critérios de Aceitação

1. WHEN um Usuário_Membro com saldo de Token_Dobro maior que zero solicita ativar o dobro para um Jogo_Agendado em um Grupo_Com_Dobro, THE Sistema_Palpites SHALL criar o registro de Palpite_Dobrado vinculando o usuário, o jogo e o grupo, e decrementar 1 Token_Dobro do saldo do usuário naquele grupo.
2. WHEN um Usuário_Membro tenta ativar o dobro para um jogo cujo status é diferente de AGENDADO, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o jogo não aceita mais ativação de dobro.
3. WHEN um Usuário_Membro com saldo de Token_Dobro igual a zero tenta ativar o dobro, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o usuário não possui fichas de dobro disponíveis.
4. WHEN um Usuário_Membro tenta ativar o dobro para um jogo no qual já possui dobro ativo no mesmo grupo, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que já existe dobro ativo para este jogo neste grupo.
5. WHEN um Usuário_Membro tenta ativar o dobro em um grupo que não possui palpite dobrado habilitado, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o grupo não permite palpite dobrado.
6. WHEN um usuário autenticado que não é membro do grupo tenta ativar o dobro, THE Sistema_Palpites SHALL rejeitar a requisição com erro de permissão.

### Requisito 12: Desativar Palpite Dobrado de um Jogo

**User Story:** Como membro de um grupo, eu quero cancelar a ativação do dobro em um jogo antes dele começar, para que eu possa mudar minha estratégia.

#### Critérios de Aceitação

1. WHEN um Usuário_Membro solicita desativar o dobro de um Jogo_Agendado em um Grupo_Com_Dobro, THE Sistema_Palpites SHALL remover o registro de Palpite_Dobrado e incrementar 1 Token_Dobro no saldo do usuário naquele grupo.
2. WHEN um Usuário_Membro tenta desativar o dobro de um jogo cujo status é diferente de AGENDADO, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que o jogo já começou e o dobro não pode ser cancelado.
3. WHEN um Usuário_Membro tenta desativar o dobro de um jogo no qual não possui dobro ativo no grupo, THE Sistema_Palpites SHALL rejeitar a requisição com erro informando que não existe dobro ativo para este jogo neste grupo.

### Requisito 13: Consultar Saldo e Histórico de Tokens de Dobro

**User Story:** Como membro de um grupo, eu quero consultar meu saldo de fichas de dobro e o histórico de conquistas, para que eu possa planejar minha estratégia.

#### Critérios de Aceitação

1. WHEN um Usuário_Membro solicita o saldo de Token_Dobro em um Grupo_Com_Dobro, THE Sistema_Palpites SHALL retornar o saldo atual de fichas disponíveis do usuário naquele grupo.
2. WHEN um Usuário_Membro solicita o histórico de Token_Dobro em um Grupo_Com_Dobro, THE Sistema_Palpites SHALL retornar a lista de concessões e utilizações de fichas, incluindo motivo, data e referência ao contexto (faseId ou jogoId).
3. WHEN um usuário autenticado que não é membro do grupo tenta consultar saldo ou histórico de Token_Dobro, THE Sistema_Palpites SHALL rejeitar a requisição com erro de permissão.
4. WHEN um Usuário_Membro solicita saldo de Token_Dobro em um grupo que não possui palpite dobrado habilitado, THE Sistema_Palpites SHALL retornar saldo zero e lista vazia de histórico.

### Requisito 14: Aplicação do Multiplicador no Ranking do Grupo

**User Story:** Como membro de um grupo, eu quero que meus palpites dobrados valham o dobro de pontos no ranking, para que a mecânica de palpite dobrado impacte a classificação.

#### Critérios de Aceitação

1. WHILE um Grupo_Com_Dobro possui palpite dobrado habilitado, WHEN o ranking do grupo é calculado e um Usuário_Membro possui Palpite_Dobrado ativo para um jogo finalizado, THE Sistema_Palpites SHALL multiplicar por 2 os pontos obtidos pelo palpite do usuário naquele jogo para o ranking do grupo.
2. WHEN um Usuário_Membro não possui Palpite_Dobrado ativo para um jogo, THE Sistema_Palpites SHALL calcular os pontos do palpite com multiplicador 1 (sem alteração).
3. THE Sistema_Palpites SHALL garantir que o multiplicador de dobro é aplicado apenas no contexto do grupo onde o Palpite_Dobrado foi ativado, sem afetar o mesmo palpite em outros grupos.
4. WHEN o ranking do grupo é calculado, THE Sistema_Palpites SHALL exibir indicação visual (flag) nos palpites que possuem Palpite_Dobrado ativo.

### Requisito 15: Unicidade de Palpite Dobrado por Jogo por Grupo

**User Story:** Como operador do sistema, eu quero garantir que cada usuário tenha no máximo um palpite dobrado por jogo por grupo, para que a integridade dos dados seja mantida.

#### Critérios de Aceitação

1. THE Sistema_Palpites SHALL garantir a constraint de unicidade na combinação (usuarioId, jogoId, grupoId) na tabela de Palpite_Dobrado no banco de dados.
2. IF uma tentativa de inserção viola a constraint de unicidade de Palpite_Dobrado, THEN THE Sistema_Palpites SHALL retornar erro informando que já existe dobro ativo para este jogo neste grupo.

### Requisito 16: Transformação de Resposta de Palpite Dobrado via Presenter

**User Story:** Como consumidor da API, eu quero receber respostas padronizadas para operações de palpite dobrado, para que a integração com o frontend seja previsível.

#### Critérios de Aceitação

1. THE Sistema_Palpites SHALL transformar todas as respostas de palpite dobrado através de um PalpiteDobradoPresenter com método estático toHttp, utilizando seleção positiva (allowlist) de campos.
2. THE Sistema_Palpites SHALL incluir nos dados de resposta de palpite dobrado: id, usuarioId, jogoId, grupoId e dataCriacao.
3. THE Sistema_Palpites SHALL transformar todas as respostas de Token_Dobro através de um TokenDobroPresenter com método estático toHttp, incluindo: id, usuarioId, grupoId, motivo, referenciaId, tipo (CONCESSAO ou UTILIZACAO) e dataCriacao.

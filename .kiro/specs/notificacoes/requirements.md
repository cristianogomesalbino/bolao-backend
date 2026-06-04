# Requirements Document

## Introduction

Módulo de notificações para o Bolão Backend, composto por dois sistemas complementares: notificações in-app (armazenadas no banco de dados, exibidas como badge/sino no frontend) e notificações Web Push (enviadas ao navegador do usuário mesmo com a aplicação fechada). As notificações são disparadas automaticamente pelo sistema em resposta a eventos de domínio (finalização de jogos, mudança de posição no ranking, proximidade de jogos) e por jobs agendados (cron).

## Glossary

- **Sistema_Notificacoes**: Módulo responsável por criar, armazenar, listar e marcar como lidas as notificações in-app dos usuários
- **Sistema_Push**: Módulo responsável por gerenciar inscrições Web Push e enviar notificações push aos navegadores dos usuários
- **Agendador**: Componente de jobs agendados (cron) responsável por disparar notificações baseadas em tempo (via @nestjs/schedule)
- **Notificacao**: Registro persistido no banco representando uma notificação in-app para um usuário específico
- **Inscricao_Push**: Registro persistido no banco contendo os dados de inscrição Web Push de um usuário (endpoint, chaves p256dh e auth)
- **Evento_Notificacao**: Ação de domínio que dispara a criação de notificações (ex: jogo finalizado, rodada encerrada)
- **Tipo_Notificacao**: Classificação da notificação que identifica o evento de origem (JOGO_PROXIMO, RODADA_ENCERRADA, ACERTO_EM_CHEIO, SUBIU_POSICAO, DESCEU_POSICAO, PALPITES_PENDENTES)
- **Preferencia_Notificacao**: Configuração por usuário que define quais tipos de notificação deseja receber
- **Ranking_Service**: Serviço existente que calcula pontuação e posição dos membros de um grupo on-the-fly

## Requirements

### Requirement 1: Criar Notificação In-App

**User Story:** As a usuário do bolão, I want receber notificações in-app sobre eventos relevantes, so that eu fique informado sobre o que acontece nos meus grupos sem precisar verificar manualmente.

#### Acceptance Criteria

1. WHEN um Evento_Notificacao ocorre, THE Sistema_Notificacoes SHALL criar uma Notificacao com tipo, título (máximo 100 caracteres), mensagem (máximo 500 caracteres), usuarioId, e referências opcionais (jogoId, grupoId, faseId)
2. THE Sistema_Notificacoes SHALL persistir cada Notificacao com status "NAO_LIDA" e dataCriacao preenchida automaticamente com timestamp do servidor
3. THE Sistema_Notificacoes SHALL associar cada Notificacao a exatamente um usuário destinatário
4. WHEN o evento envolve múltiplos usuários (ex: rodada encerrada), THE Sistema_Notificacoes SHALL criar uma Notificacao individual para cada usuário afetado usando operação batch (createMany)
5. IF um usuarioId referenciado na criação batch não existir no sistema, THEN THE Sistema_Notificacoes SHALL ignorar o usuário inválido, criar notificações para os demais e registrar warning em log

### Requirement 2: Listar Notificações do Usuário

**User Story:** As a usuário autenticado, I want listar minhas notificações, so that eu possa ver todas as atualizações relevantes em um único lugar.

#### Acceptance Criteria

1. WHEN o usuário requisita suas notificações, THE Sistema_Notificacoes SHALL retornar as notificações ordenadas por dataCriacao decrescente com paginação (limit/offset), utilizando limit padrão de 20 e limit máximo de 50
2. THE Sistema_Notificacoes SHALL retornar apenas notificações do usuário autenticado (nunca de outros usuários)
3. THE Sistema_Notificacoes SHALL incluir na resposta a contagem total de notificações não lidas do usuário e a contagem total de notificações que atendem ao filtro aplicado (para navegação de páginas)
4. WHEN o usuário requisita suas notificações com filtro de status, THE Sistema_Notificacoes SHALL retornar apenas notificações com o status informado (NAO_LIDA ou LIDA)
5. IF o usuário informa parâmetros de paginação inválidos (limit menor que 1, limit maior que 50, ou offset menor que 0), THEN THE Sistema_Notificacoes SHALL retornar erro de validação indicando os valores aceitos

### Requirement 3: Marcar Notificações como Lidas

**User Story:** As a usuário autenticado, I want marcar notificações como lidas, so that eu saiba quais informações já visualizei.

#### Acceptance Criteria

1. WHEN o usuário marca uma notificação específica como lida, THE Sistema_Notificacoes SHALL alterar o status da Notificacao de NAO_LIDA para LIDA e registrar a dataLeitura com o timestamp do servidor no momento da requisição
2. WHEN o usuário solicita marcar todas as notificações como lidas, THE Sistema_Notificacoes SHALL alterar o status de todas as notificações NAO_LIDA do usuário para LIDA, registrando a dataLeitura em cada uma, em operação batch limitada a no máximo 1000 notificações por requisição
3. IF o usuário tenta marcar como lida uma notificação que não pertence a ele ou que não existe no sistema, THEN THE Sistema_Notificacoes SHALL retornar erro de recurso não encontrado sem revelar se a notificação existe para outro usuário
4. IF o usuário tenta marcar como lida uma notificação já lida, THEN THE Sistema_Notificacoes SHALL retornar sucesso sem alterar o registro nem sobrescrever a dataLeitura original (operação idempotente)

### Requirement 4: Gerenciar Inscrição Web Push

**User Story:** As a usuário autenticado, I want inscrever meu navegador para receber notificações push, so that eu seja avisado de eventos importantes mesmo quando não estiver com a aplicação aberta.

#### Acceptance Criteria

1. WHEN o usuário envia dados de inscrição push (endpoint, chave p256dh, chave auth), THE Sistema_Push SHALL validar que o endpoint é uma URL válida (máximo 2048 caracteres), que p256dh é uma string base64 de até 128 caracteres e que auth é uma string base64 de até 48 caracteres, e persistir a Inscricao_Push associada ao usuário
2. THE Sistema_Push SHALL permitir no máximo 10 inscrições ativas por usuário (uma por dispositivo/navegador)
3. WHEN o usuário envia uma inscrição com endpoint já existente para o mesmo usuário, THE Sistema_Push SHALL atualizar as chaves da inscrição existente em vez de criar duplicata
4. WHEN o usuário solicita cancelar inscrição push informando o endpoint, THE Sistema_Push SHALL remover a Inscricao_Push correspondente ao endpoint do usuário autenticado
5. IF o envio de push para uma inscrição retorna erro 410 (Gone) ou 404, THEN THE Sistema_Push SHALL remover automaticamente a Inscricao_Push inválida
6. IF o usuário envia dados de inscrição com campos inválidos (endpoint não é URL, p256dh ou auth vazios ou acima do limite de caracteres), THEN THE Sistema_Push SHALL rejeitar a requisição com erro de validação indicando os campos inválidos
7. IF o usuário solicita cancelar inscrição push com endpoint que não existe para o usuário autenticado, THEN THE Sistema_Push SHALL retornar erro de recurso não encontrado
8. IF o usuário já possui 10 inscrições ativas e tenta criar uma nova inscrição com endpoint diferente, THEN THE Sistema_Push SHALL rejeitar a requisição com erro indicando que o limite de inscrições foi atingido

### Requirement 5: Enviar Notificação Web Push

**User Story:** As a usuário inscrito em push, I want receber notificações push no meu navegador, so that eu seja alertado em tempo real sobre eventos do bolão.

#### Acceptance Criteria

1. WHEN uma Notificacao in-app é criada para um usuário com Inscricao_Push ativa, THE Sistema_Push SHALL enviar uma notificação push para todas as inscrições ativas do usuário dentro de 10 segundos após a criação da notificação in-app
2. THE Sistema_Push SHALL incluir no payload da notificação push: título (máximo 50 caracteres, truncado se exceder), mensagem (máximo 150 caracteres, truncada se exceder) e tipo da notificação (para deep linking no frontend)
3. IF o tipo da notificação não estiver habilitado nas preferências de push do usuário, THEN THE Sistema_Push SHALL suprimir o envio da notificação push sem registrar erro
4. IF o envio de push falhar por erro temporário (timeout de 5 segundos ou resposta 5xx), THEN THE Sistema_Push SHALL registrar o erro em log e prosseguir sem interromper o fluxo de criação da notificação in-app, sem realizar retentativas
5. IF o endpoint de push retornar erro permanente (status 404 ou 410), THEN THE Sistema_Push SHALL remover a Inscricao_Push correspondente e não tentar envios futuros para essa inscrição

### Requirement 6: Notificação de Jogo Próximo (10 minutos)

**User Story:** As a usuário com palpites em um jogo, I want ser notificado 10 minutos antes do início do jogo, so that eu lembre de revisar ou fazer meu palpite a tempo.

#### Acceptance Criteria

1. WHEN o cron identifica um jogo com status AGENDADO cuja dataHora está entre 0 e 10 minutos à frente do horário atual e que ainda não possui registro de notificação JOGO_PROXIMO, THE Agendador SHALL disparar notificação com tipo JOGO_PROXIMO para todos os membros dos grupos vinculados à temporada do jogo
2. WHEN a notificação JOGO_PROXIMO é criada, THE Agendador SHALL incluir na mensagem os nomes dos dois times no formato "Jogo {timeCasa} × {timeFora} começa em 10 minutos!"
3. THE Agendador SHALL executar verificação a cada 1 minuto (cron) para identificar jogos elegíveis, garantindo que execuções concorrentes não ocorram (se a execução anterior ainda estiver em andamento, a nova execução é ignorada)
4. THE Sistema_Notificacoes SHALL manter registro de notificações já enviadas por jogo e tipo (chave única jogoId + tipo) para evitar duplicação de envio
5. IF o Agendador falhar durante o processamento de um jogo específico, THEN THE Agendador SHALL logar o erro e prosseguir para o próximo jogo elegível sem interromper o ciclo de verificação

### Requirement 7: Notificação de Rodada Encerrada

**User Story:** As a membro de um grupo, I want ser notificado quando uma rodada for encerrada, so that eu confira o ranking atualizado.

#### Acceptance Criteria

1. WHEN um jogo transiciona para status FINALIZADO e todos os demais jogos da mesma rodada e fase que possuem status diferente de CANCELADO e ADIADO já estão com status FINALIZADO, THE Sistema_Notificacoes SHALL criar uma notificação com tipo RODADA_ENCERRADA para todos os membros ativos dos grupos vinculados à temporada da fase
2. WHEN a notificação RODADA_ENCERRADA é criada, THE Sistema_Notificacoes SHALL incluir na mensagem o número da rodada e o nome da fase
3. IF a rodada contiver apenas jogos com status CANCELADO ou ADIADO (nenhum jogo FINALIZADO), THEN THE Sistema_Notificacoes SHALL não gerar notificação de RODADA_ENCERRADA para essa rodada
4. IF uma notificação RODADA_ENCERRADA já foi criada para a mesma combinação de fase e rodada, THEN THE Sistema_Notificacoes SHALL não criar notificação duplicada
5. THE Sistema_Notificacoes SHALL avaliar o encerramento da rodada exclusivamente quando um jogo transiciona para FINALIZADO (disparado pelo evento de finalização, não por job periódico)

### Requirement 8: Notificação de Acerto em Cheio

**User Story:** As a usuário que fez um palpite exato, I want ser notificado imediatamente quando acertei em cheio, so that eu celebre minha conquista.

#### Acceptance Criteria

1. WHEN um jogo é finalizado e o palpite de um usuário corresponde exatamente ao placar final (golsCasa e golsFora), THE Sistema_Notificacoes SHALL criar uma notificação com tipo ACERTO_EM_CHEIO para o usuário em cada grupo onde ele possui o palpite correspondente, incluindo o grupoId e jogoId como referências
2. THE Sistema_Notificacoes SHALL incluir na mensagem os nomes dos times, o placar e os pontos efetivamente ganhos considerando o multiplicador de palpite dobrado quando aplicável (ex: "Você acertou em cheio! Flamengo 2 × 1 Palmeiras (+3 pts)" ou "+6 pts" se dobrado)
3. IF o usuário não possui palpite registrado para o jogo finalizado, THEN THE Sistema_Notificacoes SHALL não criar notificação ACERTO_EM_CHEIO para esse usuário
4. IF já existe uma notificação ACERTO_EM_CHEIO para o mesmo usuário, jogo e grupo, THEN THE Sistema_Notificacoes SHALL não criar notificação duplicada

### Requirement 9: Notificação de Mudança de Posição no Ranking

**User Story:** As a membro de um grupo, I want ser notificado quando minha posição no ranking mudar, so that eu acompanhe minha evolução na competição.

#### Acceptance Criteria

1. WHEN um jogo é finalizado e a posição de um membro no ranking geral do grupo melhora em relação à posição imediatamente anterior à finalização, THE Sistema_Notificacoes SHALL criar uma notificação com tipo SUBIU_POSICAO incluindo a posição anterior, a nova posição e o nome do grupo
2. WHEN um jogo é finalizado e a posição de um membro no ranking geral do grupo piora em relação à posição imediatamente anterior à finalização, THE Sistema_Notificacoes SHALL criar uma notificação com tipo DESCEU_POSICAO incluindo a posição anterior, a nova posição e o nome do grupo
3. WHEN um jogo é finalizado, THE Sistema_Notificacoes SHALL capturar o ranking geral do grupo antes de processar a pontuação do jogo e compará-lo com o ranking geral após o processamento para determinar mudanças de posição
4. THE Sistema_Notificacoes SHALL criar notificações de posição apenas para membros cuja posição numérica efetivamente mudou, desconsiderando membros que mantiveram a mesma posição mesmo com alteração de pontuação
5. IF um membro não possui posição anterior no ranking geral do grupo (primeiro jogo finalizado da temporada para o grupo), THEN THE Sistema_Notificacoes SHALL não criar notificação de mudança de posição para esse membro
6. WHEN um jogo é finalizado e pertence a uma temporada com múltiplos grupos, THE Sistema_Notificacoes SHALL avaliar e criar notificações de mudança de posição independentemente para cada grupo vinculado à temporada do jogo

### Requirement 10: Notificação de Palpites Pendentes

**User Story:** As a membro de um grupo, I want ser lembrado de palpites pendentes antes do início da rodada, so that eu não esqueça de palpitar.

#### Acceptance Criteria

1. THE Agendador SHALL executar verificação a cada 30 minutos para identificar rodadas cujo primeiro jogo com status AGENDADO inicia nas próximas 3 horas e que ainda não tiveram notificação PALPITES_PENDENTES disparada para aquela rodada
2. WHEN a verificação identifica uma rodada elegível, THE Agendador SHALL consultar todos os membros ativos dos grupos vinculados à temporada da rodada e determinar quais possuem palpites pendentes, sendo palpite pendente definido como a ausência de palpite registrado para um jogo com status AGENDADO ou ADIADO naquela rodada
3. WHEN um membro possui pelo menos 1 palpite pendente, THE Sistema_Notificacoes SHALL criar notificação com tipo PALPITES_PENDENTES incluindo a quantidade de palpites faltantes e o número da rodada
4. THE Sistema_Notificacoes SHALL enviar no máximo uma notificação PALPITES_PENDENTES por rodada por usuário por grupo, ignorando verificações subsequentes para combinações já notificadas
5. IF a criação da notificação falhar para um membro, THEN THE Sistema_Notificacoes SHALL registrar o erro em log e continuar o processamento dos demais membros sem interromper o ciclo de verificação

### Requirement 11: Preferências de Notificação

**User Story:** As a usuário do bolão, I want configurar quais tipos de notificação desejo receber, so that eu não seja incomodado com notificações que não me interessam.

#### Acceptance Criteria

1. WHEN o usuário realiza seu primeiro login ou sua primeira inscrição push (o que ocorrer primeiro), THE Sistema_Notificacoes SHALL criar uma Preferencia_Notificacao para o usuário com todos os 6 tipos (JOGO_PROXIMO, RODADA_ENCERRADA, ACERTO_EM_CHEIO, SUBIU_POSICAO, DESCEU_POSICAO, PALPITES_PENDENTES) habilitados
2. WHEN o usuário envia atualização de preferências contendo um ou mais tipos com valor habilitado/desabilitado, THE Sistema_Notificacoes SHALL persistir apenas os tipos informados (atualização parcial), mantendo os demais inalterados
3. IF um Evento_Notificacao ocorre e o tipo correspondente está desabilitado nas preferências do usuário, THEN THE Sistema_Notificacoes SHALL pular a criação da Notificacao in-app e do push para aquele usuário
4. IF um Evento_Notificacao ocorre e o usuário não possui registro de Preferencia_Notificacao, THEN THE Sistema_Notificacoes SHALL tratar como todos os tipos habilitados (comportamento padrão) e criar a Notificacao normalmente
5. IF o usuário envia atualização de preferências contendo um tipo não pertencente ao conjunto válido de Tipo_Notificacao, THEN THE Sistema_Notificacoes SHALL retornar erro de validação indicando os tipos aceitos

### Requirement 12: Limpeza de Notificações Antigas

**User Story:** As a administrador do sistema, I want que notificações antigas sejam removidas automaticamente, so that o banco de dados não cresça indefinidamente.

#### Acceptance Criteria

1. THE Agendador SHALL executar limpeza diária às 02:00 BRT, removendo notificações com dataLeitura anterior a 30 dias
2. THE Agendador SHALL executar limpeza diária às 02:00 BRT, removendo notificações não lidas com dataCriacao anterior a 90 dias
3. THE Sistema_Notificacoes SHALL realizar a limpeza em batches de no máximo 1000 registros por iteração, com intervalo de 1 segundo entre batches
4. IF a limpeza de um batch falhar, THEN THE Sistema_Notificacoes SHALL registrar o erro em log e prosseguir para o próximo batch sem interromper o processo completo
5. WHEN a limpeza diária for concluída, THE Agendador SHALL registrar em log a quantidade total de notificações removidas

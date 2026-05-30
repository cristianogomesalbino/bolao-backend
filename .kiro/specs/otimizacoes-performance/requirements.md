# Documento de Requisitos

## Introdução

Plano completo de otimizações para o Bolão Backend, cobrindo performance crítica, índices de banco de dados, transações, segurança e arquitetura. Cada requisito representa uma otimização independente, implementável e testável, priorizada por impacto (problemas críticos de performance primeiro, quick wins depois).

## Glossário

- **Sistema**: O backend do Bolão (API NestJS)
- **FutebolApiService**: Service responsável pela integração com a API externa de futebol (ge.globo.com)
- **RankingService**: Service responsável pelo cálculo de ranking e concessão de tokens
- **PalpiteService**: Service responsável pelo CRUD de palpites
- **JogoService**: Service responsável pelo gerenciamento de jogos (~350+ linhas)
- **GroupRoleGuard**: Guard de autorização por role dentro de grupo
- **DomainExceptionFilter**: Filter global para captura de Domain Errors
- **N+1**: Anti-pattern onde N queries individuais são executadas dentro de um loop em vez de uma única query batch
- **O(38)**: Complexidade linear fixa de 38 chamadas HTTP (uma por rodada do Brasileirão)
- **Repository Pattern**: Padrão arquitetural onde services dependem de interfaces de repositório, não de implementações concretas
- **ConfigService**: Service do NestJS para acesso tipado a variáveis de ambiente
- **Rate Limiting**: Mecanismo de limitação de requisições por IP/usuário para proteção contra abuso

## Requisitos

### Requisito 1: Eliminar O(38) chamadas HTTP em buscarJogosPorIds

**User Story:** Como desenvolvedor, quero que o buscarJogosPorIds busque jogos de forma eficiente, para que operações de sincronização completem em segundos em vez de minutos.

#### Critérios de Aceite

1. QUANDO o FutebolApiService receber uma lista de IDs externos para sincronização, O FutebolApiService DEVE resolver todos os dados dos jogos sem iterar todas as 38 rodadas sequencialmente
2. QUANDO o FutebolApiService precisar encontrar jogos por IDs externos, O FutebolApiService DEVE usar uma estratégia que busca apenas as rodadas necessárias com base nos metadados disponíveis (rodada armazenada na entidade Jogo)
3. SE a API externa estiver indisponível para uma rodada específica, ENTÃO O FutebolApiService DEVE pular essa rodada e continuar processando as rodadas restantes sem lançar erro

### Requisito 2: Eliminar N+1 em buscarJogosFinalizadosDeFases

**User Story:** Como desenvolvedor, quero que o ranking geral carregue todos os jogos finalizados em uma única query, para que o tempo de resposta escale com o volume de dados e não com o número de fases.

#### Critérios de Aceite

1. QUANDO o RankingService calcular o ranking geral, O RankingService DEVE buscar todos os jogos finalizados de todas as fases de uma temporada em uma única query ao banco em vez de uma query por fase
2. QUANDO o JogoRepository receber múltiplos IDs de fase, O JogoRepository DEVE fornecer um método batch `buscarFinalizadosPorFases(faseIds: string[])` que retorna todos os jogos finalizados em uma query

### Requisito 3: Eliminar N+1 em concederTokensPorAcertoEmCheio

**User Story:** Como desenvolvedor, quero que as verificações de existência de tokens sejam feitas em batch, para que o processamento de um jogo finalizado não gere N queries individuais para N membros do grupo.

#### Critérios de Aceite

1. QUANDO o RankingService processar concessão de tokens por acerto em cheio, O RankingService DEVE buscar todos os tokens existentes para os membros relevantes em uma única query batch antes do loop
2. QUANDO o TokenDobroRepository receber múltiplas chaves (usuarioId, grupoId, motivo, referenciaId), O TokenDobroRepository DEVE fornecer um método batch `buscarPorChaves(keys[])` que retorna todos os tokens correspondentes em uma query

### Requisito 4: Eliminar N+1 em concederTokensPorPosicaoRanking

**User Story:** Como desenvolvedor, quero que a concessão de tokens por posição no ranking use queries batch, para que o processamento de fim de fase não escale linearmente com o número de membros em primeiro/último lugar.

#### Critérios de Aceite

1. QUANDO o RankingService conceder tokens para primeira e última posição do ranking, O RankingService DEVE buscar todos os tokens existentes para os membros e motivos relevantes em uma única query batch
2. QUANDO o RankingService determinar tokens a criar, O RankingService DEVE criar todos os novos tokens em uma única operação batch em vez de inserts individuais

### Requisito 5: Eliminar N+1 em verificarPalpitesCompletos

**User Story:** Como desenvolvedor, quero que a verificação de palpites completos use lookups batch de tokens, para que a operação não gere uma query por membro do grupo.

#### Critérios de Aceite

1. QUANDO o RankingService verificar palpites completos para uma fase, O RankingService DEVE buscar todos os tokens PALPITES_COMPLETOS existentes para o grupo e fase em uma única query antes de iterar os membros
2. QUANDO o RankingService identificar membros elegíveis para o token, O RankingService DEVE criar todos os novos tokens em uma única operação batch

### Requisito 6: Paralelizar processarPontuacaoJogo por grupo

**User Story:** Como desenvolvedor, quero que o processamento de pontuação de jogos trate múltiplos grupos concorrentemente, para que a finalização de um jogo com muitos grupos não bloqueie sequencialmente.

#### Critérios de Aceite

1. QUANDO o RankingService processar pontuação para um jogo finalizado, O RankingService DEVE processar todos os grupos concorrentemente usando `Promise.allSettled` em vez de `for...of` sequencial
2. SE o processamento de um grupo falhar, ENTÃO O RankingService DEVE logar o erro e continuar processando os grupos restantes sem interrupção

### Requisito 7: Batch insert em criarLote do PalpiteService

**User Story:** Como desenvolvedor, quero que a criação em lote de palpites use uma única operação de banco, para que criar 10 palpites não exija 10 inserts individuais.

#### Critérios de Aceite

1. QUANDO o PalpiteService criar um lote de palpites válidos, O PalpiteService DEVE inserir todos os palpites válidos em uma única operação de banco usando `createMany` ou método batch equivalente
2. QUANDO o PalpiteRepository receber múltiplos objetos de dados de palpite, O PalpiteRepository DEVE fornecer um método `criarVarios(data[])` que executa um único batch insert

### Requisito 8: Cache de ranking calculado

**User Story:** Como desenvolvedor, quero que os cálculos de ranking sejam cacheados, para que requisições repetidas para o mesmo ranking não recalculem do zero toda vez.

#### Critérios de Aceite

1. QUANDO o RankingService calcular um ranking para um grupo e fase, O RankingService DEVE cachear o resultado com um TTL apropriado para a volatilidade dos dados (invalidado quando um jogo daquela fase é finalizado)
2. QUANDO um jogo for finalizado, O RankingService DEVE invalidar rankings cacheados para todos os grupos associados à temporada do jogo
3. QUANDO um ranking cacheado existir e for válido, O RankingService DEVE retornar o resultado cacheado sem recalcular

### Requisito 9: Adicionar índices de banco de dados ausentes

**User Story:** Como desenvolvedor, quero que todas as foreign keys usadas em queries de listagem tenham índices no banco, para que a performance das queries não degrade conforme os dados crescem.

#### Critérios de Aceite

1. O Schema Prisma DEVE incluir um `@@index([campeonatoId])` no model Temporada
2. O Schema Prisma DEVE incluir um `@@index([temporadaId])` no model Grupo
3. O Schema Prisma DEVE incluir um `@@index([criadoPor])` no model Grupo
4. O Schema Prisma DEVE incluir um `@@index([grupoId])` no model GrupoUsuario
5. O Schema Prisma DEVE incluir um `@@index([usuarioId])` no model RefreshToken
6. O Schema Prisma DEVE incluir um `@@index([referenciaId])` no model TokenDobro

### Requisito 10: Adicionar transação em GruposService.criar

**User Story:** Como desenvolvedor, quero que a criação de grupo seja atômica, para que uma falha ao adicionar o membro admin não deixe um grupo órfão no banco.

#### Critérios de Aceite

1. QUANDO o GruposService criar um novo grupo, O GruposService DEVE envolver a criação do grupo e a inserção do membro admin em uma única `$transaction` do Prisma
2. SE a inserção do membro admin falhar, ENTÃO O GruposService DEVE fazer rollback da criação do grupo e propagar o erro

### Requisito 11: Adicionar transação em PalpiteDobradoService.ativarDobro

**User Story:** Como desenvolvedor, quero que a ativação do palpite dobrado seja atômica, para que o consumo de token e a criação do dobro sejam sempre consistentes.

#### Critérios de Aceite

1. QUANDO o PalpiteDobradoService ativar um palpite dobrado, O PalpiteDobradoService DEVE envolver a criação do PalpiteDobrado e o registro de utilização do TokenDobro em uma única `$transaction` do Prisma
2. SE o registro de utilização do TokenDobro falhar, ENTÃO O PalpiteDobradoService DEVE fazer rollback da criação do PalpiteDobrado e propagar o erro

### Requisito 12: Implementar rate limiting

**User Story:** Como usuário, quero que a API seja protegida contra ataques de força bruta, para que minhas credenciais permaneçam seguras.

#### Critérios de Aceite

1. O Sistema DEVE limitar tentativas de login a 5 requisições por minuto por endereço IP
2. O Sistema DEVE limitar requisições de recuperação de senha a 3 requisições por minuto por endereço IP
3. O Sistema DEVE aplicar um rate limit geral de 100 requisições por minuto por usuário autenticado em todos os outros endpoints
4. SE um cliente exceder o rate limit, ENTÃO O Sistema DEVE responder com HTTP 429 (Too Many Requests) e incluir um header `Retry-After`

### Requisito 13: Corrigir CORS para produção

**User Story:** Como desenvolvedor, quero que a configuração de CORS exclua localhost em produção, para que a API não aceite requisições de origens não autorizadas em produção.

#### Critérios de Aceite

1. ENQUANTO a aplicação rodar em produção (NODE_ENV = production), O Sistema DEVE excluir `http://localhost:3003` das origens CORS permitidas
2. ENQUANTO a aplicação rodar em desenvolvimento (NODE_ENV !== production), O Sistema DEVE incluir tanto localhost quanto a URL do frontend de produção nas origens CORS permitidas

### Requisito 14: Migrar JWT secret para ConfigService

**User Story:** Como desenvolvedor, quero que a configuração JWT use ConfigService, para que o acesso a variáveis de ambiente seja validado e centralizado seguindo boas práticas do NestJS.

#### Critérios de Aceite

1. O AuthModule DEVE usar `JwtModule.registerAsync` com `ConfigService` para fornecer o JWT secret em vez de acessar `process.env.JWT_SECRET` diretamente
2. QUANDO a aplicação iniciar, O AuthModule DEVE validar que a variável de ambiente JWT_SECRET está definida e lançar um erro descritivo se estiver ausente

### Requisito 15: Refatorar GroupRoleGuard para usar Repository Pattern

**User Story:** Como desenvolvedor, quero que o GroupRoleGuard dependa da interface GrupoUsuarioRepository, para que siga o mesmo padrão arquitetural do resto da aplicação e seja testável com implementações InMemory.

#### Critérios de Aceite

1. O GroupRoleGuard DEVE injetar `GrupoUsuarioRepository` via token em vez de usar `PrismaService` diretamente
2. O GroupRoleGuard DEVE usar um método do repositório para verificar membership e role do usuário em vez de chamar `prisma.grupoUsuario.findUnique` diretamente

### Requisito 16: Remover registro duplicado do DomainExceptionFilter

**User Story:** Como desenvolvedor, quero que o DomainExceptionFilter seja registrado em um único local, para que a ordem de execução dos filters seja previsível e não haja processamento redundante.

#### Critérios de Aceite

1. O Sistema DEVE registrar o DomainExceptionFilter em exatamente um local (ou `main.ts` via `useGlobalFilters` ou `AppModule` via `APP_FILTER`, não ambos)
2. QUANDO um DomainError for lançado, O DomainExceptionFilter DEVE processar o erro exatamente uma vez

### Requisito 17: Dividir JogoService em services especializados

**User Story:** Como desenvolvedor, quero que as responsabilidades do JogoService sejam divididas em services focados, para que cada service tenha uma única responsabilidade e seja mais fácil de manter e testar.

#### Critérios de Aceite

1. O JogosModule DEVE fornecer um `FinalizacaoService` responsável exclusivamente pela lógica de finalização de jogos (finalizar, finalizarPontosCorridos, finalizarMataMata e helpers relacionados)
2. O JogosModule DEVE fornecer um `ImportacaoService` responsável exclusivamente pela importação de jogos da API externa
3. O JogosModule DEVE fornecer um `SincronizacaoService` responsável exclusivamente pela sincronização de placares com a API externa
4. O JogoService DEVE reter apenas operações CRUD (criar, atualizar, buscarPorId, buscarPorFase) e validação de transição de status

### Requisito 18: Implementar paginação em endpoints de listagem

**User Story:** Como usuário, quero que endpoints de listagem retornem resultados paginados, para que a aplicação permaneça responsiva conforme os dados crescem.

#### Critérios de Aceite

1. QUANDO um endpoint de listagem receber parâmetros `page` e `pageSize`, O Sistema DEVE retornar apenas a página solicitada com metadados de paginação (total, page, pageSize, totalPages)
2. QUANDO um endpoint de listagem não receber parâmetros de paginação, O Sistema DEVE aplicar paginação padrão (page=1, pageSize=20)
3. O Sistema DEVE aplicar paginação nos seguintes endpoints: listagem de campeonatos, temporadas, grupos, membros de grupo, jogos por fase e palpites do usuário

### Requisito 19: Remover código morto

**User Story:** Como desenvolvedor, quero que código não utilizado seja removido, para que a codebase permaneça enxuta e não confunda futuros mantenedores.

#### Critérios de Aceite

1. O JogoService DEVE remover o método `calcularVencedor` que nunca é chamado por nenhum outro componente da codebase
2. O package.json DEVE remover a dependência `fast-check` das devDependencies já que nenhum teste property-based existe no projeto

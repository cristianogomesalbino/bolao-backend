# Plano de Implementação: Otimizações de Performance

## Visão Geral

Implementação incremental das otimizações de performance, banco de dados, segurança e refatorações arquiteturais do Bolão Backend. A ordem de execução prioriza: gargalos críticos de performance → banco de dados → segurança → arquitetura.

## Tasks

- [ ] 1. Performance Crítica — FutebolApiService e RankingService
  - [ ] 1.1 Otimizar `buscarJogosPorIds` no FutebolApiService para buscar apenas rodadas necessárias
    - Alterar assinatura para receber `rodadasPorId: Map<number, number>` com o mapeamento externoId → rodada
    - Extrair rodadas distintas do mapa e buscar em paralelo com `Promise.allSettled`
    - Filtrar apenas os IDs solicitados dos resultados bem-sucedidos (rodadas com falha são ignoradas)
    - Atualizar `JogoService.sincronizarPlacares` para montar o mapa de rodadas a partir dos jogos do banco
    - _Requisitos: 1.1, 1.2, 1.3_

  - [ ] 1.2 Escrever teste de propriedade para equivalência da busca otimizada
    - **Property 1: Equivalência da busca otimizada por rodadas**
    - **Property 2: Resiliência a falhas parciais da API externa**
    - **Valida: Requisitos 1.1, 1.2, 1.3**

  - [ ] 1.3 Adicionar método `buscarFinalizadosPorFases(faseIds)` no JogoRepository
    - Adicionar método na interface `JogoRepository`
    - Implementar no `PrismaJogoRepository` com `WHERE faseId IN (...) AND status = 'FINALIZADO'`
    - Implementar no `InMemoryJogoRepository`
    - _Requisitos: 2.1, 2.2_

  - [ ] 1.4 Refatorar `buscarJogosFinalizadosDeFases` no RankingService para usar query batch
    - Substituir loop com query individual por chamada única a `buscarFinalizadosPorFases`
    - Remover método privado `buscarJogosFinalizadosDeFases` com loop sequencial
    - _Requisitos: 2.1, 2.2_

  - [ ] 1.5 Escrever teste de propriedade para equivalência da query batch
    - **Property 3: Equivalência da query batch de jogos finalizados**
    - **Valida: Requisitos 2.1, 2.2**

  - [ ] 1.6 Adicionar métodos batch no TokenDobroRepository (`buscarPorChaves`, `criarVarios`)
    - Adicionar `buscarPorChaves(keys[])` na interface `TokenDobroRepository`
    - Adicionar `criarVarios(data[])` na interface `TokenDobroRepository`
    - Implementar no `PrismaTokenDobroRepository` com `WHERE OR` e `createMany`
    - Implementar no `InMemoryTokenDobroRepository`
    - _Requisitos: 3.2, 4.2, 5.2_

  - [ ] 1.7 Refatorar `concederTokensPorAcertoEmCheio` para usar queries batch
    - Buscar todos os tokens existentes em batch antes do loop de membros
    - Coletar tokens a criar e inserir em batch com `criarVarios`
    - _Requisitos: 3.1, 3.2_

  - [ ] 1.8 Refatorar `concederTokensPorPosicaoRanking` para usar queries batch
    - Buscar tokens existentes para todos os membros de primeiro/último lugar em uma query
    - Criar tokens faltantes em batch com `criarVarios`
    - _Requisitos: 4.1, 4.2_

  - [ ] 1.9 Refatorar `verificarPalpitesCompletos` para usar lookups batch de tokens
    - Buscar todos os tokens PALPITES_COMPLETOS do grupo/fase em uma query antes de iterar membros
    - Criar tokens faltantes em batch
    - _Requisitos: 5.1, 5.2_

  - [ ] 1.10 Escrever teste de propriedade para operações batch de tokens
    - **Property 4: Equivalência das operações batch de tokens**
    - **Valida: Requisitos 3.1, 3.2, 4.1, 4.2, 5.1, 5.2**

- [ ] 2. Checkpoint — Verificar testes de performance crítica
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [ ] 3. Performance — Concorrência, Batch Insert e Cache
  - [ ] 3.1 Paralelizar `processarPontuacaoJogo` com `Promise.allSettled`
    - Substituir `for...of` sequencial por `Promise.allSettled` para processar grupos em paralelo
    - Manter log de erros individuais por grupo sem interromper os demais
    - _Requisitos: 6.1, 6.2_

  - [ ] 3.2 Escrever teste de propriedade para processamento concorrente
    - **Property 5: Equivalência do processamento concorrente de grupos**
    - **Property 6: Isolamento de erros entre grupos**
    - **Valida: Requisitos 6.1, 6.2**

  - [ ] 3.3 Adicionar método `criarVarios` no PalpiteRepository e refatorar `criarLote`
    - Adicionar `criarVarios(data[])` na interface `PalpiteRepository`
    - Implementar no `PrismaPalpiteRepository` com `createMany({ skipDuplicates: true })`
    - Implementar no `InMemoryPalpiteRepository`
    - Refatorar `PalpiteService.criarLote` para separar válidos/inválidos e inserir válidos em batch
    - _Requisitos: 7.1, 7.2_

  - [ ] 3.4 Escrever teste de propriedade para batch insert de palpites
    - **Property 7: Equivalência do batch insert de palpites**
    - **Valida: Requisitos 7.1, 7.2**

  - [ ] 3.5 Implementar `RankingCacheService` com Map em memória e TTL
    - Criar `RankingCacheService` com métodos `get`, `set`, `invalidarPorGrupo`, `invalidarPorTemporada`
    - TTL de 5 minutos, chave: `ranking:{grupoId}:{faseId}:{rodada}:{ateRodada}`
    - Registrar no `RankingModule`
    - _Requisitos: 8.1, 8.3_

  - [ ] 3.6 Integrar cache no RankingService com invalidação por evento
    - Adicionar verificação de cache antes do cálculo em `obterRankingFase` e `obterRankingGeral`
    - Invalidar cache em `processarPontuacaoJogo` (quando jogo é finalizado)
    - _Requisitos: 8.1, 8.2, 8.3_

  - [ ] 3.7 Escrever teste de propriedade para consistência e invalidação do cache
    - **Property 8: Consistência do cache de ranking**
    - **Property 9: Invalidação correta do cache**
    - **Valida: Requisitos 8.1, 8.2, 8.3**

- [ ] 4. Checkpoint — Verificar testes de concorrência e cache
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [ ] 5. Banco de Dados — Índices e Transações
  - [ ] 5.1 Adicionar 5 novos `@@index` no schema Prisma e gerar migration
    - `@@index([campeonatoId])` em Temporada
    - `@@index([temporadaId])` em Grupo
    - `@@index([criadoPor])` em Grupo
    - `@@index([grupoId])` em GrupoUsuario
    - `@@index([usuarioId])` em RefreshToken
    - `@@index([referenciaId])` em TokenDobro
    - Gerar migration: `npx prisma migrate dev --name add_performance_indexes`
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 5.2 Adicionar transação atômica em `GruposService.criar`
    - Envolver criação do grupo + inserção do membro admin em `prisma.$transaction`
    - Criar `TransactionService` ou expor `PrismaService` para uso transacional nos services
    - Garantir rollback se inserção do membro admin falhar
    - _Requisitos: 10.1, 10.2_

  - [ ] 5.3 Escrever teste de propriedade para atomicidade da criação de grupo
    - **Property 10: Atomicidade da criação de grupo**
    - **Valida: Requisitos 10.1, 10.2**

  - [ ] 5.4 Adicionar transação atômica em `PalpiteDobradoService.ativarDobro`
    - Envolver criação do PalpiteDobrado + registro de utilização do TokenDobro em `prisma.$transaction`
    - Garantir rollback se registro de utilização falhar
    - _Requisitos: 11.1, 11.2_

  - [ ] 5.5 Escrever teste de propriedade para atomicidade do palpite dobrado
    - **Property 11: Atomicidade da ativação de palpite dobrado**
    - **Valida: Requisitos 11.1, 11.2**

- [ ] 6. Checkpoint — Verificar testes de banco de dados
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [ ] 7. Segurança — Rate Limiting, CORS e JWT
  - [ ] 7.1 Instalar `@nestjs/throttler` e configurar rate limiting global
    - Instalar pacote `@nestjs/throttler`
    - Configurar `ThrottlerModule.forRoot` no `AppModule` com limite geral de 100 req/min
    - Registrar `ThrottlerGuard` como `APP_GUARD`
    - _Requisitos: 12.3, 12.4_

  - [ ] 7.2 Adicionar overrides de rate limiting em endpoints sensíveis
    - `@Throttle({ default: { ttl: 60000, limit: 5 } })` no endpoint de login
    - `@Throttle({ default: { ttl: 60000, limit: 3 } })` no endpoint de recuperação de senha
    - _Requisitos: 12.1, 12.2_

  - [ ] 7.3 Escrever teste unitário para rate limiting
    - **Property 12: Aplicação de rate limiting**
    - **Valida: Requisitos 12.1, 12.2, 12.3, 12.4**

  - [ ] 7.4 Configurar CORS condicional baseado em `NODE_ENV`
    - Em produção: apenas `https://bolao-frontend-beige.vercel.app`
    - Em desenvolvimento: incluir `http://localhost:3003` e URL de produção
    - Usar `ConfigService` para ler `NODE_ENV`
    - _Requisitos: 13.1, 13.2_

  - [ ] 7.5 Migrar JWT secret para `ConfigService` com `JwtModule.registerAsync`
    - Substituir `JwtModule.register({ secret: process.env.JWT_SECRET })` por `registerAsync` com `ConfigService`
    - Adicionar validação de startup: lançar erro descritivo se `JWT_SECRET` estiver ausente
    - Importar `ConfigModule` no `AuthModule`
    - _Requisitos: 14.1, 14.2_

- [ ] 8. Checkpoint — Verificar testes de segurança
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

- [ ] 9. Arquitetura — Refatorações e Limpeza
  - [ ] 9.1 Refatorar `GroupRoleGuard` para usar `GrupoUsuarioRepository` via token
    - Substituir injeção de `PrismaService` por `@Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)`
    - Usar método `buscarPorChave(usuarioId, grupoId)` do repositório
    - Atualizar providers no módulo que registra o guard
    - _Requisitos: 15.1, 15.2_

  - [ ] 9.2 Escrever teste unitário para GroupRoleGuard refatorado
    - **Property 13: Equivalência funcional do GroupRoleGuard refatorado**
    - **Valida: Requisitos 15.1, 15.2**

  - [ ] 9.3 Remover registro duplicado do `DomainExceptionFilter` no `main.ts`
    - Remover `new DomainExceptionFilter()` do `app.useGlobalFilters()` no `main.ts`
    - Manter apenas o registro via `APP_FILTER` no `AppModule` (já existente)
    - _Requisitos: 16.1, 16.2_

  - [ ] 9.4 Escrever teste unitário para processamento único do DomainExceptionFilter
    - **Property 14: Processamento único do DomainExceptionFilter**
    - **Valida: Requisitos 16.1, 16.2**

  - [ ] 9.5 Dividir `JogoService` em `FinalizacaoService`, `ImportacaoService` e `SincronizacaoService`
    - Criar `FinalizacaoService` com métodos: `finalizar`, `finalizarPontosCorridos`, `finalizarMataMata` e helpers
    - Criar `ImportacaoService` com métodos: `importarJogos`, `resolverOuCriarTime` e helpers
    - Criar `SincronizacaoService` com métodos: `sincronizarPlacares`, `processarJogoSync` e helpers
    - Manter no `JogoService` apenas CRUD e validação de transição de status
    - Atualizar `JogosModule` com os novos providers e exports
    - Atualizar controllers para injetar os services corretos
    - _Requisitos: 17.1, 17.2, 17.3, 17.4_

  - [ ] 9.6 Implementar paginação genérica nos endpoints de listagem
    - Criar `PaginacaoDto` com `page` e `pageSize` (defaults: 1 e 20)
    - Criar interface `RespostaPaginada<T>` e helper `calcularPaginacao`
    - Aplicar paginação em: campeonatos, temporadas, grupos, membros de grupo, jogos por fase, palpites do usuário
    - Atualizar repositórios (interface + Prisma + InMemory) com suporte a skip/take e count
    - _Requisitos: 18.1, 18.2, 18.3_

  - [ ] 9.7 Escrever teste de propriedade para correção da paginação
    - **Property 15: Correção da paginação**
    - **Valida: Requisitos 18.1, 18.2**

  - [ ] 9.8 Remover código morto (`calcularVencedor` e dependência `fast-check`)
    - Remover método `calcularVencedor` do `JogoService`
    - Remover `fast-check` das `devDependencies` no `package.json`
    - _Requisitos: 19.1, 19.2_

- [ ] 10. Checkpoint Final — Validação completa
  - Garantir que todos os testes passam, perguntar ao usuário se houver dúvidas.

## Notas

- Todas as tasks de teste são obrigatórias — seguindo a convenção do projeto de sempre criar testes junto com o código
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam propriedades universais de correção definidas no design
- Testes unitários validam exemplos específicos e edge cases
- A ordem de implementação respeita dependências: performance crítica primeiro (maior impacto), depois banco, segurança e por último arquitetura
- Transações atômicas (tasks 5.2 e 5.4) requerem acesso ao `PrismaService` — considerar criar um `TransactionService` para manter o Repository Pattern

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.6", "5.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.5", "1.7", "1.8", "1.9"] },
    { "id": 2, "tasks": ["1.10", "3.1", "3.3", "3.5"] },
    { "id": 3, "tasks": ["3.2", "3.4", "3.6"] },
    { "id": 4, "tasks": ["3.7", "5.2", "5.4"] },
    { "id": 5, "tasks": ["5.3", "5.5", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5"] },
    { "id": 7, "tasks": ["9.1", "9.3", "9.8"] },
    { "id": 8, "tasks": ["9.2", "9.4", "9.5"] },
    { "id": 9, "tasks": ["9.6"] },
    { "id": 10, "tasks": ["9.7"] }
  ]
}
```

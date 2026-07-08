---
inclusion: fileMatch
fileMatchPattern: "prisma/**"
---

# Prisma & Banco de Dados

## Schema

O schema fica em `prisma/schema.prisma`. Provider: PostgreSQL (Supabase).

## Convenções

- IDs são UUID gerados com `@default(uuid())`
- Campos de data: `dataCriacao` com `@default(now())`, `atualizadoEm` com `@updatedAt`
- Soft delete via campo `ativo: Boolean @default(true)` — não deletar registros diretamente (exceto Grupo inativo)
- Nomes de models e campos em português (Campeonato, Temporada, Usuario, Grupo, GrupoUsuario)
- Enums em UPPER_CASE inglês (SUPER_ADMIN, USER, ADMIN, MEMBER, AGENDADO, ADIADO, FINALIZADO, CANCELADO)
- Relações nomeadas quando há múltiplas FKs para a mesma tabela (ex: `@relation("TimeCasa")`, `@relation("TimeFora")`)

## Relações

- Campeonato 1:N Temporada
- Temporada 1:N Fase
- Temporada 1:N Grupo
- Fase 1:N Jogo
- Jogo N:1 Time (timeCasa via `@relation("TimeCasa")`)
- Jogo N:1 Time (timeFora via `@relation("TimeFora")`)
- Jogo 1:N Palpite
- Jogo 1:N PalpiteDobrado
- Usuario 1:N Grupo (criador, via `criadoPor`)
- Usuario N:N Grupo (membros, via GrupoUsuario com role)
- Usuario 1:N RefreshToken (cascade delete)
- Usuario 1:N RecuperacaoSenha (cascade delete)
- Usuario 1:N Palpite
- Usuario 1:N TokenDobro

## Enums

- `Perfil`: SUPER_ADMIN, USER
- `GrupoRole`: ADMIN, MEMBER
- `TipoFase`: PONTOS_CORRIDOS, MATA_MATA
- `StatusJogo`: AGENDADO, ADIADO, EM_ANDAMENTO, FINALIZADO, CANCELADO
- `FonteResultado`: MANUAL, API_EXTERNA
- `TipoTokenDobro`: CONCESSAO, UTILIZACAO
- `MotivoTokenDobro`: PALPITES_COMPLETOS, ACERTO_EM_CHEIO, ULTIMO_RANKING, PRIMEIRO_RANKING, ATIVACAO_DOBRO, CANCELAMENTO_DOBRO

## Campos Nullable Importantes

- `Jogo.dataHora` — nullable para jogos adiados (status = ADIADO)
- `Jogo.rodada` — nullable para fases mata-mata (não têm rodada numérica)
- `Jogo.externoId` — nullable para jogos criados manualmente (sem API externa)
- `Jogo.vencedorId` — nullable até o jogo ser finalizado (ou empate em pontos corridos)

## Migrations

- Gerar: `docker compose exec app-dev npx prisma migrate dev --name descricao_da_mudanca`
- Aplicar em produção: `npx prisma migrate deploy`
- O container Docker roda `prisma migrate deploy` automaticamente no startup
- **ANTES de adicionar FK**: verificar se existem dados órfãos que violam a constraint

### Regras Críticas de Migrations (NUNCA violar)

- **NUNCA usar `prisma db push` em desenvolvimento** — sempre usar `prisma migrate dev` para que a migration SQL seja gerada e commitada
- **NUNCA mergear para main sem verificar que TODAS as migrations necessárias existem na pasta `prisma/migrations/`** — se o schema.prisma tem models/enums que não existem em nenhuma migration commitada, o deploy VAI falhar em produção
- **TODA alteração no schema.prisma DEVE ter uma migration correspondente commitada** — se o model foi criado via `db push` ou manualmente no banco, criar a migration retroativamente com `prisma migrate dev` antes de mergear
- **Migrations incrementais (ALTER TABLE) requerem que a migration de criação (CREATE TABLE) exista antes** — verificar a ordem cronológica dos arquivos em `prisma/migrations/`
- **Antes de mergear feature branch para main**, executar mentalmente: "se eu fizer `prisma migrate deploy` num banco limpo com apenas as migrations commitadas, tudo roda sem erro?" — se a resposta for não, faltam migrations

### Protocolo Pré-Merge para Main

1. Listar todos os models/enums no `schema.prisma`
2. Para cada model/enum, verificar se existe uma migration em `prisma/migrations/` que o cria (CREATE TABLE / CREATE TYPE)
3. Verificar que migrations de ALTER referenciam tabelas/enums já criados por migrations anteriores (pela data do nome da pasta)
4. Se algum model/enum não tem migration de criação — criar com `prisma migrate dev --name add_[nome_do_modulo]` ANTES de mergear

## Grupos

- Grupos privados recebem `codigoConvite` único de 8 caracteres (gerado com nanoid, constante `GRUPOS.CODIGO_CONVITE_LENGTH`)
- `maxParticipantes` default 50 (constante `GRUPOS.MAX_PARTICIPANTES_DEFAULT`)
- Grupo precisa ser desativado (`ativo: false`) antes de ser excluído

## Jogos

- Status ADIADO: jogo sem data definida (importado da API com `data_realizacao: null`)
- Campo `foiAdiado`: boolean permanente — uma vez true, nunca volta para false
- Transições válidas: AGENDADO→EM_ANDAMENTO, AGENDADO→ADIADO, AGENDADO→CANCELADO, ADIADO→AGENDADO, ADIADO→CANCELADO, EM_ANDAMENTO→FINALIZADO, EM_ANDAMENTO→CANCELADO

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
- Enums em UPPER_CASE inglês (SUPER_ADMIN, USER, ADMIN, MEMBER)

## Relações

- Campeonato 1:N Temporada
- Temporada 1:N Grupo
- Usuario 1:N Grupo (criador, via `criadoPor`)
- Usuario N:N Grupo (membros, via GrupoUsuario com role)
- Usuario 1:N RefreshToken (cascade delete)

## Migrations

- Gerar: `npx prisma migrate dev --name descricao_da_mudanca`
- Aplicar em produção: `npx prisma migrate deploy`
- O container Docker roda `prisma migrate deploy` automaticamente no startup

## Grupos

- Grupos privados recebem `codigoConvite` único de 8 caracteres (gerado com nanoid)
- `maxParticipantes` default 50
- Grupo precisa ser desativado (`ativo: false`) antes de ser excluído

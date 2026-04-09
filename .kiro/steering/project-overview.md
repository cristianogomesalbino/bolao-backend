---
inclusion: always
---

# Bolão Backend — Visão Geral

API REST para gerenciamento de bolões de campeonatos de futebol.

## Stack

- NestJS 11 com TypeScript
- Prisma ORM 6 com PostgreSQL (Supabase)
- Autenticação JWT (access token 15min + refresh token 7d)
- Swagger em `/docs`
- Docker Compose com profiles `dev` (hot reload) e `prod` (build)
- Script `dev` para gerenciar containers: `sh dev start-dev`, `sh dev stop`, `sh dev logs`, `sh dev npm ...`, `sh dev npx ...`
- Em desenvolvimento usar `sh dev start-dev` (hot reload, sem rebuild)
- Em produção usar `sh dev start-prod` (rebuild da imagem)

## Estrutura de Módulos

```
src/modules/
├── auth/            # Login, refresh, logout, guards, decorators
├── usuarios/        # CRUD de usuários com bcrypt e soft delete
├── campeonatos/     # Gerenciamento de campeonatos
├── temporadas/      # Temporadas vinculadas a campeonatos
├── grupos/          # Grupos de bolão (público/privado, código convite)
└── grupo-usuario/   # Membros dos grupos (entrar, sair, remover)
```

## Modelos Prisma

- Campeonato → Temporada → Grupo → GrupoUsuario
- Usuario (perfil: SUPER_ADMIN | USER)
- GrupoUsuario (role: ADMIN | MEMBER)
- RefreshToken

## Regras de Domínio

- Criador do grupo sempre começa como ADMIN
- Roles dentro do grupo são independentes do perfil global do usuário
- Um usuário pode ser ADMIN em um grupo e MEMBER em outro
- Palpites só podem ser feitos antes do jogo começar
- Um usuário só pode participar uma vez por grupo

## Roadmap de Módulos

1. ~~Auth~~ ✅
2. ~~Usuarios~~ ✅
3. ~~Campeonatos~~ ✅
4. ~~Temporadas~~ ✅
5. ~~Grupos~~ ✅
6. ~~GrupoUsuario~~ ✅
7. Jogos — Jogos pertencem à temporada, contêm placar e status
8. Palpites — Usuário aposta em jogos, apenas 1 por jogo, não pode apostar após início
9. Ranking — Pontuação baseada em acertos, ranking por grupo

## Idioma

O projeto usa português brasileiro para nomes de entidades, DTOs, mensagens de erro e endpoints.
Nomes de classes, decorators e padrões do NestJS seguem inglês (Controller, Service, Module, Guard).

# Plano de Testes E2E — Bolão Backend

## Convenções

- **Pré-condição**: estado necessário antes do teste
- **Auth**: tipo de autenticação necessária (Nenhuma, JWT, JWT+SUPER_ADMIN, JWT+Admin do grupo, JWT+Membro)
- **Esperado**: status HTTP + validação do body
- **Prioridade**: P0 (crítico), P1 (importante), P2 (edge case)

---

## 1. Health Check

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 1.1 | Health check retorna ok | GET | /health | Nenhuma | — | 200, `{ status: 'ok' }` | P0 |

---

## 2. Autenticação (/auth)

### Pré-condição: usuário cadastrado (email: test@test.com, senha: senha123)

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 2.1 | Login com credenciais válidas | POST | /auth/login | Nenhuma | `{ email, senha }` | 201, `{ accessToken, refreshToken }` | P0 |
| 2.2 | Login com email inexistente | POST | /auth/login | Nenhuma | `{ email: 'x@x.com', senha }` | 401 | P0 |
| 2.3 | Login com senha errada | POST | /auth/login | Nenhuma | `{ email, senha: 'errada' }` | 401 | P0 |
| 2.4 | Login com usuário inativo | POST | /auth/login | Nenhuma | `{ email, senha }` | 401 | P1 |
| 2.5 | Refresh com token válido | POST | /auth/refresh | Nenhuma | `{ refreshToken }` | 201, `{ accessToken }` | P0 |
| 2.6 | Refresh com token inválido | POST | /auth/refresh | Nenhuma | `{ refreshToken: 'lixo' }` | 401 | P0 |
| 2.7 | Refresh com token vazio | POST | /auth/refresh | Nenhuma | `{ refreshToken: '' }` | 401 | P1 |
| 2.8 | Logout com token válido | POST | /auth/logout | JWT | `{ refreshToken }` | 201, `{ mensagem }` | P0 |
| 2.9 | Logout com token vazio | POST | /auth/logout | JWT | `{ refreshToken: '' }` | 401 | P1 |
| 2.10 | Logout sem autenticação | POST | /auth/logout | Nenhuma | `{ refreshToken }` | 401 | P1 |

---

## 3. Usuários (/usuarios)

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 3.1 | Criar usuário com dados válidos | POST | /usuarios | Nenhuma | `{ nome, email, senha }` | 201, sem campo senha no retorno | P0 |
| 3.2 | Criar usuário com email duplicado | POST | /usuarios | Nenhuma | `{ nome, email existente, senha }` | 409 | P0 |
| 3.3 | Criar usuário sem campos obrigatórios | POST | /usuarios | Nenhuma | `{}` | 400 | P1 |
| 3.4 | Buscar perfil autenticado | GET | /usuarios/me | JWT | — | 200, dados do usuário | P0 |
| 3.5 | Buscar perfil sem auth | GET | /usuarios/me | Nenhuma | — | 401 | P1 |
| 3.6 | Buscar usuário por ID (próprio) | GET | /usuarios/:id | JWT | — | 200 | P0 |
| 3.7 | Buscar usuário por ID (outro, sem ser admin) | GET | /usuarios/:id | JWT | — | 403 | P1 |
| 3.8 | Buscar usuário inexistente | GET | /usuarios/:id | JWT | — | 404 | P1 |
| 3.9 | Buscar usuário inativo | GET | /usuarios/:id | JWT | — | 404 | P2 |
| 3.10 | Atualizar nome do próprio usuário | PATCH | /usuarios/:id | JWT | `{ nome }` | 200 | P0 |
| 3.11 | Atualizar senha (hash aplicado) | PATCH | /usuarios/:id | JWT | `{ senha }` | 200 | P1 |
| 3.12 | Atualizar usuário de outro (sem ser admin) | PATCH | /usuarios/:id | JWT | `{ nome }` | 403 | P1 |
| 3.13 | Desativar usuário (soft delete) | DELETE | /usuarios/:id | JWT | — | 200, `{ mensagem }` | P0 |
| 3.14 | Desativar usuário já inativo | DELETE | /usuarios/:id | JWT | — | 200, mensagem diferente | P2 |
| 3.15 | Desativar usuário inexistente | DELETE | /usuarios/:id | JWT | — | 404 | P1 |

---

## 4. Campeonatos (/campeonatos)

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 4.1 | Criar campeonato | POST | /campeonatos | JWT | `{ nome }` | 201 | P0 |
| 4.2 | Criar campeonato sem nome | POST | /campeonatos | JWT | `{}` | 400 | P1 |
| 4.3 | Listar campeonatos | GET | /campeonatos | JWT | — | 200, array | P0 |
| 4.4 | Listar campeonatos sem auth | GET | /campeonatos | Nenhuma | — | 401 | P1 |

---

## 5. Temporadas (/temporadas)

### Pré-condição: campeonato existente

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 5.1 | Criar temporada com campeonato válido | POST | /temporadas | JWT | `{ ano, campeonatoId }` | 201 | P0 |
| 5.2 | Criar temporada com campeonato inexistente | POST | /temporadas | JWT | `{ ano, campeonatoId: 'xxx' }` | 404 | P0 |
| 5.3 | Listar temporadas | GET | /temporadas | JWT | — | 200, array com campeonato incluso | P0 |

---

## 6. Grupos (/grupos)

### Pré-condição: temporada existente

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 6.1 | Criar grupo privado | POST | /grupos | JWT | `{ nome, temporadaId, privado: true }` | 201, codigoConvite preenchido | P0 |
| 6.2 | Criar grupo público | POST | /grupos | JWT | `{ nome, temporadaId, privado: false }` | 201, codigoConvite null | P0 |
| 6.3 | Criar grupo com temporada inexistente | POST | /grupos | JWT | `{ nome, temporadaId: 'xxx' }` | 404 | P1 |
| 6.4 | Listar grupos ativos | GET | /grupos | JWT | — | 200, apenas ativos | P0 |
| 6.5 | Buscar grupo por ID | GET | /grupos/:grupoId | JWT | — | 200 | P0 |
| 6.6 | Buscar grupo inexistente | GET | /grupos/:grupoId | JWT | — | 404 | P1 |
| 6.7 | Buscar grupo inativo | GET | /grupos/:grupoId | JWT | — | 404 | P2 |
| 6.8 | Atualizar grupo (admin) | PATCH | /grupos/:grupoId | JWT+Admin | `{ nome }` | 200 | P0 |
| 6.9 | Atualizar grupo (não admin) | PATCH | /grupos/:grupoId | JWT | `{ nome }` | 403 | P1 |
| 6.10 | Desativar grupo | PATCH | /grupos/:grupoId/status | JWT+Admin | `{ ativo: false }` | 200 | P0 |
| 6.11 | Excluir grupo inativo | DELETE | /grupos/:grupoId | JWT+Admin | — | 200 | P0 |
| 6.12 | Excluir grupo ativo → erro | DELETE | /grupos/:grupoId | JWT+Admin | — | 400 | P1 |

---

## 7. Membros do Grupo (/grupos)

### Pré-condição: grupo existente com admin

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 7.1 | Entrar por código de convite válido | POST | /grupos/entrar | JWT | `{ codigoConvite }` | 201 | P0 |
| 7.2 | Entrar com código inválido | POST | /grupos/entrar | JWT | `{ codigoConvite: 'XXX' }` | 404 | P0 |
| 7.3 | Entrar em grupo inativo | POST | /grupos/entrar | JWT | `{ codigoConvite }` | 400 | P1 |
| 7.4 | Entrar já estando no grupo | POST | /grupos/entrar | JWT | `{ codigoConvite }` | 409 | P1 |
| 7.5 | Entrar com grupo lotado | POST | /grupos/entrar | JWT | `{ codigoConvite }` | 400 | P2 |
| 7.6 | Adicionar membro por email (admin) | POST | /grupos/:grupoId/adicionar | JWT+Admin | `{ email }` | 201 | P0 |
| 7.7 | Adicionar membro com email inexistente | POST | /grupos/:grupoId/adicionar | JWT+Admin | `{ email: 'x@x.com' }` | 404 | P1 |
| 7.8 | Adicionar membro já no grupo | POST | /grupos/:grupoId/adicionar | JWT+Admin | `{ email }` | 409 | P1 |
| 7.9 | Listar membros do grupo | GET | /grupos/:grupoId/membros | JWT+Membro | — | 200, array com role e usuario | P0 |
| 7.10 | Listar membros de grupo inexistente | GET | /grupos/:grupoId/membros | JWT | — | 404 | P1 |
| 7.11 | Sair do grupo (MEMBER) | DELETE | /grupos/:grupoId/sair | JWT | — | 200 | P0 |
| 7.12 | Sair do grupo (único ADMIN) → erro | DELETE | /grupos/:grupoId/sair | JWT | — | 400 | P0 |
| 7.13 | Sair do grupo (ADMIN com outro admin) | DELETE | /grupos/:grupoId/sair | JWT | — | 200 | P1 |
| 7.14 | Remover membro (admin) | DELETE | /grupos/:grupoId/usuarios/:usuarioId | JWT+Admin | — | 200 | P0 |
| 7.15 | Remover membro inexistente | DELETE | /grupos/:grupoId/usuarios/:usuarioId | JWT+Admin | — | 404 | P1 |

---

## 8. Fases (/temporadas/:temporadaId/fases)

### Pré-condição: temporada existente

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 8.1 | Criar fase PONTOS_CORRIDOS | POST | /temporadas/:id/fases | JWT | `{ nome, tipo: 'PONTOS_CORRIDOS', ordem: 1 }` | 201 | P0 |
| 8.2 | Criar fase MATA_MATA com idaVolta | POST | /temporadas/:id/fases | JWT | `{ nome, tipo: 'MATA_MATA', ordem: 2, idaVolta: true }` | 201 | P0 |
| 8.3 | Criar fase com temporada inexistente | POST | /temporadas/:id/fases | JWT | `{ nome, tipo, ordem }` | 404 | P1 |
| 8.4 | Criar fase PONTOS_CORRIDOS com idaVolta true → erro | POST | /temporadas/:id/fases | JWT | `{ nome, tipo: 'PONTOS_CORRIDOS', ordem: 1, idaVolta: true }` | 400 | P1 |
| 8.5 | Criar fase com tipo inválido | POST | /temporadas/:id/fases | JWT | `{ nome, tipo: 'INVALIDO', ordem: 1 }` | 400 | P2 |
| 8.6 | Listar fases ordenadas por ordem | GET | /temporadas/:id/fases | JWT | — | 200, ordenado por ordem asc | P0 |
| 8.7 | Buscar fase por ID | GET | /temporadas/:id/fases/:faseId | JWT | — | 200 | P0 |
| 8.8 | Buscar fase inexistente | GET | /temporadas/:id/fases/:faseId | JWT | — | 404 | P1 |

---

## 9. Jogos — Criação e Consulta

### Pré-condição: fase existente

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 9.1 | Criar jogo com dados válidos | POST | /fases/:faseId/jogos | JWT | `{ timeCasaId, timeForaId, dataHora }` | 201, status=AGENDADO, fonteResultado=MANUAL | P0 |
| 9.2 | Criar jogo com times iguais | POST | /fases/:faseId/jogos | JWT | `{ timeCasaId: 'a', timeForaId: 'a', dataHora }` | 400 | P0 |
| 9.3 | Criar jogo com fase inexistente | POST | /fases/:faseId/jogos | JWT | `{ timeCasaId, timeForaId, dataHora }` | 404 | P1 |
| 9.4 | Criar jogo em PC → grupoIdaVolta null, ehJogoVolta false | POST | /fases/:faseId/jogos | JWT | `{ ..., grupoIdaVolta: 'g1', ehJogoVolta: true }` | 201, campos forçados | P1 |
| 9.5 | Criar jogo sem auth | POST | /fases/:faseId/jogos | Nenhuma | `{ ... }` | 401 | P1 |
| 9.6 | Listar jogos da fase | GET | /fases/:faseId/jogos | JWT | — | 200, ordenado por dataHora | P0 |
| 9.7 | Buscar jogo por ID | GET | /jogos/:id | JWT | — | 200 | P0 |
| 9.8 | Buscar jogo inexistente | GET | /jogos/:id | JWT | — | 404 | P1 |

---

## 10. Jogos — Atualização e Transições de Status

### Pré-condição: jogo existente com status AGENDADO

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 10.1 | Atualizar dataHora | PATCH | /jogos/:id | JWT | `{ dataHora }` | 200 | P0 |
| 10.2 | Atualizar times (mantendo diferentes) | PATCH | /jogos/:id | JWT | `{ timeCasaId: 'novo' }` | 200 | P1 |
| 10.3 | Atualizar com times iguais | PATCH | /jogos/:id | JWT | `{ timeCasaId: 'b' }` (timeForaId já é 'b') | 400 | P1 |
| 10.4 | AGENDADO → EM_ANDAMENTO | PATCH | /jogos/:id | JWT | `{ status: 'EM_ANDAMENTO' }` | 200 | P0 |
| 10.5 | AGENDADO → CANCELADO | PATCH | /jogos/:id | JWT | `{ status: 'CANCELADO' }` | 200 | P0 |
| 10.6 | AGENDADO → FINALIZADO (inválido) | PATCH | /jogos/:id | JWT | `{ status: 'FINALIZADO' }` | 400 | P0 |
| 10.7 | EM_ANDAMENTO → CANCELADO | PATCH | /jogos/:id | JWT | `{ status: 'CANCELADO' }` | 200 | P1 |
| 10.8 | Atualizar jogo FINALIZADO | PATCH | /jogos/:id | JWT | `{ dataHora }` | 400 | P0 |
| 10.9 | Atualizar jogo CANCELADO | PATCH | /jogos/:id | JWT | `{ dataHora }` | 400 | P0 |
| 10.10 | Atualizar jogo inexistente | PATCH | /jogos/:id | JWT | `{ dataHora }` | 404 | P1 |
| 10.11 | Atualizar jogo API_FOOTBALL → fonteResultado vira MANUAL | PATCH | /jogos/:id | JWT | `{ dataHora }` | 200, fonteResultado=MANUAL | P1 |

---

## 11. Jogos — Finalização Pontos Corridos

### Pré-condição: jogo em fase PC com status EM_ANDAMENTO

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 11.1 | Vitória casa (2x1) | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 2, golsFora: 1 }` | 200, vencedorId=timeCasaId | P0 |
| 11.2 | Vitória fora (0x3) | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 0, golsFora: 3 }` | 200, vencedorId=timeForaId | P0 |
| 11.3 | Empate (1x1) | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 1 }` | 200, vencedorId=null | P0 |
| 11.4 | Goleada (7x1) | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 7, golsFora: 1 }` | 200 | P2 |
| 11.5 | Placar 0x0 | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 0, golsFora: 0 }` | 200, vencedorId=null | P1 |
| 11.6 | Placar negativo | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: -1, golsFora: 0 }` | 400 | P0 |
| 11.7 | Com prorrogação → erro | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 1, temProrrogacao: true, ... }` | 400 | P0 |
| 11.8 | Com pênaltis → erro | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 1, temPenaltis: true, ... }` | 400 | P1 |
| 11.9 | Finalizar jogo AGENDADO (sem passar por EM_ANDAMENTO) | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 0 }` | 400 | P1 |

---

## 12. Jogos — Finalização Mata-Mata

### Pré-condição: jogo em fase MM com status EM_ANDAMENTO

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 12.1 | Sem empate (3x1) → vencedor direto | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 3, golsFora: 1 }` | 200, vencedorId=timeCasaId | P0 |
| 12.2 | Empate + prorrogação (1x1, 2x1) | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 1, temProrrogacao: true, golsProrrogacaoCasa: 2, golsProrrogacaoFora: 1 }` | 200, vencedorId correto | P0 |
| 12.3 | Empate + prorrogação + pênaltis (0x0, 0x0, 5x4) | PATCH | /jogos/:id/finalizar | JWT | `{ ..., temPenaltis: true, penaltisCasa: 5, penaltisFora: 4 }` | 200, vencedorId correto | P0 |
| 12.4 | Empate sem prorrogação → VencedorObrigatorioError | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 1 }` | 400 | P0 |
| 12.5 | Empate prorrogação sem pênaltis → VencedorObrigatorioError | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 1, temProrrogacao: true, golsProrrogacaoCasa: 0, golsProrrogacaoFora: 0 }` | 400 | P0 |
| 12.6 | Prorrogação sem empate no TN → erro | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 2, golsFora: 1, temProrrogacao: true, ... }` | 400 | P1 |
| 12.7 | Pênaltis sem empate na prorrogação → erro | PATCH | /jogos/:id/finalizar | JWT | `{ ..., golsProrrogacaoCasa: 2, golsProrrogacaoFora: 1, temPenaltis: true, ... }` | 400 | P1 |
| 12.8 | Pênaltis empatados → erro | PATCH | /jogos/:id/finalizar | JWT | `{ ..., penaltisCasa: 4, penaltisFora: 4 }` | 400 | P0 |
| 12.9 | Vitória fora no MM (1x2) | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 2 }` | 200, vencedorId=timeForaId | P1 |

---

## 13. Jogos — Ida e Volta

### Pré-condição: fase MM com idaVolta=true

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 13.1 | Criar jogo de ida | POST | /fases/:faseId/jogos | JWT | `{ ..., grupoIdaVolta: 'g1' }` | 201 | P0 |
| 13.2 | Criar jogo de volta com ida existente | POST | /fases/:faseId/jogos | JWT | `{ ..., grupoIdaVolta: 'g1', ehJogoVolta: true }` | 201 | P0 |
| 13.3 | Criar jogo de volta sem ida → erro | POST | /fases/:faseId/jogos | JWT | `{ ..., grupoIdaVolta: 'g2', ehJogoVolta: true }` | 400 | P0 |
| 13.4 | Criar jogo de volta em fase sem idaVolta → erro | POST | /fases/:faseId/jogos | JWT | `{ ..., ehJogoVolta: true }` | 400 | P1 |
| 13.5 | Finalizar jogo de ida → vencedorId null | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 2, golsFora: 1 }` | 200, vencedorId=null | P0 |
| 13.6 | Finalizar jogo de volta → vencedor por agregado | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 3, golsFora: 0 }` | 200, vencedorId correto | P0 |
| 13.7 | Finalizar volta com ida não finalizada → erro | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1, golsFora: 0 }` | 400 | P0 |
| 13.8 | Empate no agregado + prorrogação na volta | PATCH | /jogos/:id/finalizar | JWT | `{ ..., temProrrogacao: true, ... }` | 200 | P1 |
| 13.9 | Empate no agregado + pênaltis na volta | PATCH | /jogos/:id/finalizar | JWT | `{ ..., temPenaltis: true, ... }` | 200 | P2 |

---

## 14. Jogos — Integração API-Football

### Pré-condição: fase existente, RAPIDAPI_KEY configurada

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 14.1 | Importar jogos (SUPER_ADMIN) | POST | /jogos/importar | JWT+SUPER_ADMIN | `{ leagueId: 71, season: 2026, faseId }` | 201, `{ importados: N }` | P0 |
| 14.2 | Importar jogos (USER) → 403 | POST | /jogos/importar | JWT (USER) | `{ leagueId: 71, season: 2026, faseId }` | 403 | P0 |
| 14.3 | Importar jogos sem auth → 401 | POST | /jogos/importar | Nenhuma | `{ ... }` | 401 | P1 |
| 14.4 | Importar jogos duplicados (idempotência) | POST | /jogos/importar | JWT+SUPER_ADMIN | mesmos dados 2x | 201, importados=0 na 2ª vez | P0 |
| 14.5 | Importar com API indisponível | POST | /jogos/importar | JWT+SUPER_ADMIN | `{ ... }` | 502 | P1 |
| 14.6 | Sincronizar placares (SUPER_ADMIN) | POST | /fases/:faseId/jogos/sincronizar | JWT+SUPER_ADMIN | — | 200, `{ sincronizados: N }` | P0 |
| 14.7 | Sincronizar placares (USER) → 403 | POST | /fases/:faseId/jogos/sincronizar | JWT (USER) | — | 403 | P0 |
| 14.8 | Sincronizar ignora jogos MANUAL | POST | /fases/:faseId/jogos/sincronizar | JWT+SUPER_ADMIN | — | 200, jogo MANUAL inalterado | P1 |
| 14.9 | Sincronizar com API indisponível → fallback | POST | /fases/:faseId/jogos/sincronizar | JWT+SUPER_ADMIN | — | 200, usa fallback interno | P1 |

---

## 15. Jogos — Modo Híbrido

### Pré-condição: jogo importado (fonteResultado=API_FOOTBALL)

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 15.1 | Editar jogo API_FOOTBALL → fonteResultado vira MANUAL | PATCH | /jogos/:id | JWT | `{ dataHora }` | 200, fonteResultado=MANUAL | P0 |
| 15.2 | Resetar fonte com externoId | PATCH | /jogos/:id/resetar-fonte | JWT | — | 200, fonteResultado=API_FOOTBALL | P0 |
| 15.3 | Resetar fonte sem externoId → erro | PATCH | /jogos/:id/resetar-fonte | JWT | — | 400 | P0 |
| 15.4 | Resetar fonte jogo inexistente → 404 | PATCH | /jogos/:id/resetar-fonte | JWT | — | 404 | P1 |
| 15.5 | Criar jogo manual em fase com jogos importados | POST | /fases/:faseId/jogos | JWT | `{ ... }` | 201, não afeta jogos importados | P1 |

---

## 16. Jogos — Status Híbrido (Fallback)

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 16.1 | Jogo FINALIZADO não regride com sync | — | interno | — | — | status permanece FINALIZADO | P0 |
| 16.2 | API retorna status → usa mapeamento API | — | interno | — | — | status mapeado corretamente | P0 |
| 16.3 | API indisponível → fallback por tempo | — | interno | — | — | AGENDADO/EM_ANDAMENTO/FINALIZADO por dataHora | P1 |
| 16.4 | Mapeamento: NS→AGENDADO | — | interno | — | — | correto | P1 |
| 16.5 | Mapeamento: FT→FINALIZADO | — | interno | — | — | correto | P1 |
| 16.6 | Mapeamento: 1H→EM_ANDAMENTO | — | interno | — | — | correto | P1 |
| 16.7 | Mapeamento: CANC→CANCELADO | — | interno | — | — | correto | P1 |

---

## Resumo

| Módulo | Total de cenários | P0 | P1 | P2 |
|--------|-------------------|----|----|-----|
| Health | 1 | 1 | 0 | 0 |
| Auth | 10 | 4 | 6 | 0 |
| Usuários | 15 | 4 | 8 | 3 |
| Campeonatos | 4 | 2 | 2 | 0 |
| Temporadas | 3 | 2 | 1 | 0 |
| Grupos | 12 | 5 | 5 | 2 |
| Membros | 15 | 5 | 8 | 2 |
| Fases | 8 | 4 | 3 | 1 |
| Jogos Criação/Consulta | 8 | 4 | 3 | 1 |
| Jogos Atualização/Status | 11 | 5 | 5 | 1 |
| Jogos Finalização PC | 9 | 4 | 3 | 2 |
| Jogos Finalização MM | 9 | 5 | 3 | 1 |
| Jogos Ida/Volta | 9 | 4 | 3 | 2 |
| API-Football | 9 | 4 | 4 | 1 |
| Modo Híbrido | 5 | 3 | 2 | 0 |
| Status Híbrido | 7 | 2 | 5 | 0 |
| **TOTAL** | **135** | **58** | **61** | **16** |


---

## 17. Validação de DTOs — Auth

| # | Cenário | Método | Rota | Body | Esperado | Prioridade |
|---|---------|--------|------|------|----------|------------|
| 17.1 | Login sem email | POST | /auth/login | `{ senha }` | 400, campo email | P1 |
| 17.2 | Login sem senha | POST | /auth/login | `{ email }` | 400, campo senha | P1 |
| 17.3 | Login com body vazio | POST | /auth/login | `{}` | 400 | P1 |
| 17.4 | Refresh sem refreshToken | POST | /auth/refresh | `{}` | 400 | P1 |

---

## 18. Validação de DTOs — Usuários

| # | Cenário | Método | Rota | Body | Esperado | Prioridade |
|---|---------|--------|------|------|----------|------------|
| 18.1 | Criar sem nome | POST | /usuarios | `{ email, senha }` | 400, campo nome | P1 |
| 18.2 | Criar sem email | POST | /usuarios | `{ nome, senha }` | 400, campo email | P1 |
| 18.3 | Criar sem senha | POST | /usuarios | `{ nome, email }` | 400, campo senha | P1 |
| 18.4 | Criar com email inválido | POST | /usuarios | `{ nome, email: 'nao-email', senha }` | 400 | P1 |
| 18.5 | Criar com body vazio | POST | /usuarios | `{}` | 400 | P1 |
| 18.6 | Criar com campo extra (forbidNonWhitelisted) | POST | /usuarios | `{ nome, email, senha, admin: true }` | 400 | P2 |

---

## 19. Validação de DTOs — Campeonatos

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 19.1 | Criar sem nome | POST | /campeonatos | JWT | `{}` | 400 | P1 |
| 19.2 | Criar com nome não-string | POST | /campeonatos | JWT | `{ nome: 123 }` | 400 | P2 |

---

## 20. Validação de DTOs — Temporadas

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 20.1 | Criar sem ano | POST | /temporadas | JWT | `{ campeonatoId }` | 400 | P1 |
| 20.2 | Criar sem campeonatoId | POST | /temporadas | JWT | `{ ano: 2026 }` | 400 | P1 |
| 20.3 | Criar com campeonatoId inválido (não UUID) | POST | /temporadas | JWT | `{ ano: 2026, campeonatoId: 'abc' }` | 400 | P1 |

---

## 21. Validação de DTOs — Grupos

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 21.1 | Criar sem nome | POST | /grupos | JWT | `{ temporadaId, privado: true }` | 400 | P1 |
| 21.2 | Criar sem temporadaId | POST | /grupos | JWT | `{ nome, privado: true }` | 400 | P1 |
| 21.3 | Criar sem privado | POST | /grupos | JWT | `{ nome, temporadaId }` | 400 | P1 |
| 21.4 | Entrar sem codigoConvite | POST | /grupos/entrar | JWT | `{}` | 400 | P1 |
| 21.5 | Adicionar membro sem email | POST | /grupos/:id/adicionar | JWT+Admin | `{}` | 400 | P1 |

---

## 22. Validação de DTOs — Fases

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 22.1 | Criar sem nome | POST | /temporadas/:id/fases | JWT | `{ tipo: 'PONTOS_CORRIDOS', ordem: 1 }` | 400 | P1 |
| 22.2 | Criar sem tipo | POST | /temporadas/:id/fases | JWT | `{ nome: 'R1', ordem: 1 }` | 400 | P1 |
| 22.3 | Criar sem ordem | POST | /temporadas/:id/fases | JWT | `{ nome: 'R1', tipo: 'PONTOS_CORRIDOS' }` | 400 | P1 |
| 22.4 | Criar com tipo inválido | POST | /temporadas/:id/fases | JWT | `{ nome: 'R1', tipo: 'INVALIDO', ordem: 1 }` | 400 | P1 |
| 22.5 | Criar com ordem negativa | POST | /temporadas/:id/fases | JWT | `{ nome: 'R1', tipo: 'PONTOS_CORRIDOS', ordem: -1 }` | 400 | P2 |
| 22.6 | Criar com ordem decimal | POST | /temporadas/:id/fases | JWT | `{ nome: 'R1', tipo: 'PONTOS_CORRIDOS', ordem: 1.5 }` | 400 | P2 |

---

## 23. Validação de DTOs — Jogos

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 23.1 | Criar sem timeCasaId | POST | /fases/:id/jogos | JWT | `{ timeForaId, dataHora }` | 400 | P1 |
| 23.2 | Criar sem timeForaId | POST | /fases/:id/jogos | JWT | `{ timeCasaId, dataHora }` | 400 | P1 |
| 23.3 | Criar sem dataHora | POST | /fases/:id/jogos | JWT | `{ timeCasaId, timeForaId }` | 400 | P1 |
| 23.4 | Criar com dataHora inválida | POST | /fases/:id/jogos | JWT | `{ timeCasaId, timeForaId, dataHora: 'nao-data' }` | 400 | P1 |
| 23.5 | Criar com body vazio | POST | /fases/:id/jogos | JWT | `{}` | 400 | P1 |
| 23.6 | Finalizar sem golsCasa | PATCH | /jogos/:id/finalizar | JWT | `{ golsFora: 1 }` | 400 | P1 |
| 23.7 | Finalizar sem golsFora | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1 }` | 400 | P1 |
| 23.8 | Finalizar com gols decimal | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 1.5, golsFora: 0 }` | 400 | P2 |
| 23.9 | Finalizar com gols string | PATCH | /jogos/:id/finalizar | JWT | `{ golsCasa: 'dois', golsFora: 0 }` | 400 | P2 |
| 23.10 | Atualizar com status inválido | PATCH | /jogos/:id | JWT | `{ status: 'INVALIDO' }` | 400 | P1 |
| 23.11 | Importar sem leagueId | POST | /jogos/importar | JWT+SUPER_ADMIN | `{ season: 2026, faseId }` | 400 | P1 |
| 23.12 | Importar sem season | POST | /jogos/importar | JWT+SUPER_ADMIN | `{ leagueId: 71, faseId }` | 400 | P1 |
| 23.13 | Importar sem faseId | POST | /jogos/importar | JWT+SUPER_ADMIN | `{ leagueId: 71, season: 2026 }` | 400 | P1 |

---

## 24. Validação de Params UUID

| # | Cenário | Método | Rota | Auth | Esperado | Prioridade |
|---|---------|--------|------|------|----------|------------|
| 24.1 | UUID inválido em /usuarios/:id | GET | /usuarios/nao-uuid | JWT | 400, campo id | P1 |
| 24.2 | UUID inválido em /grupos/:grupoId | GET | /grupos/nao-uuid | JWT | 400, campo grupoId | P1 |
| 24.3 | UUID inválido em /jogos/:id | GET | /jogos/nao-uuid | JWT | 400, campo id | P1 |
| 24.4 | UUID inválido em /fases/:faseId/jogos | GET | /fases/nao-uuid/jogos | JWT | 400, campo faseId | P1 |
| 24.5 | UUID inválido em /temporadas/:id/fases | GET | /temporadas/nao-uuid/fases | JWT | 400, campo temporadaId | P1 |

---

## 25. Formato de Resposta de Erro

| # | Cenário | Esperado | Prioridade |
|---|---------|----------|------------|
| 25.1 | Erro de validação retorna formato `{ erros: [{ campo, mensagens }] }` | Formato correto | P0 |
| 25.2 | Erro de negócio (DomainError) retorna formato `{ erros: [{ mensagens }] }` | Formato correto, sem campo | P0 |
| 25.3 | Erro 401 retorna formato padrão | Formato correto | P1 |
| 25.4 | Erro 403 retorna formato padrão | Formato correto | P1 |
| 25.5 | Mensagens de validação em português | Todas em pt-BR | P1 |

---

## Resumo Atualizado

| Módulo | Total |
|--------|-------|
| Cenários anteriores (1-16) | 135 |
| Validação DTOs Auth | 4 |
| Validação DTOs Usuários | 6 |
| Validação DTOs Campeonatos | 2 |
| Validação DTOs Temporadas | 3 |
| Validação DTOs Grupos | 5 |
| Validação DTOs Fases | 6 |
| Validação DTOs Jogos | 13 |
| Validação Params UUID | 5 |
| Formato de Resposta | 5 |
| **TOTAL** | **184** |


---

## 26. Palpites — CRUD

### Pré-condição: jogo AGENDADO existente, usuário autenticado

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 26.1 | Criar palpite com dados válidos | POST | /jogos/:jogoId/palpites | JWT | `{ golsCasa: 2, golsFora: 1 }` | 201, id + dados | P0 |
| 26.2 | Criar palpite com jogo inexistente | POST | /jogos/:jogoId/palpites | JWT | `{ golsCasa: 1, golsFora: 0 }` | 404 | P0 |
| 26.3 | Criar palpite com jogo EM_ANDAMENTO | POST | /jogos/:jogoId/palpites | JWT | `{ golsCasa: 1, golsFora: 0 }` | 400 | P0 |
| 26.4 | Criar palpite com jogo FINALIZADO | POST | /jogos/:jogoId/palpites | JWT | `{ golsCasa: 1, golsFora: 0 }` | 400 | P0 |
| 26.5 | Criar palpite duplicado (mesmo jogo + usuário) | POST | /jogos/:jogoId/palpites | JWT | `{ golsCasa: 1, golsFora: 0 }` | 409 | P0 |
| 26.6 | Criar palpite sem auth | POST | /jogos/:jogoId/palpites | Nenhuma | `{ golsCasa: 1, golsFora: 0 }` | 401 | P1 |
| 26.7 | Editar palpite próprio | PATCH | /palpites/:id | JWT | `{ golsCasa: 3, golsFora: 0 }` | 200, dados atualizados | P0 |
| 26.8 | Editar palpite de outro usuário | PATCH | /palpites/:id | JWT | `{ golsCasa: 3, golsFora: 0 }` | 403 | P0 |
| 26.9 | Editar palpite com jogo não AGENDADO | PATCH | /palpites/:id | JWT | `{ golsCasa: 3, golsFora: 0 }` | 400 | P0 |
| 26.10 | Editar palpite inexistente | PATCH | /palpites/:id | JWT | `{ golsCasa: 3, golsFora: 0 }` | 404 | P1 |
| 26.11 | Excluir palpite próprio | DELETE | /palpites/:id | JWT | — | 200, `{ mensagem }` | P0 |
| 26.12 | Excluir palpite de outro usuário | DELETE | /palpites/:id | JWT | — | 403 | P0 |
| 26.13 | Excluir palpite com jogo não AGENDADO | DELETE | /palpites/:id | JWT | — | 400 | P0 |
| 26.14 | Excluir palpite inexistente | DELETE | /palpites/:id | JWT | — | 404 | P1 |

---

## 27. Palpites — Consulta

### Pré-condição: palpites existentes

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 27.1 | Buscar meu palpite por jogo | GET | /jogos/:jogoId/meu-palpite | JWT | — | 200, dados do palpite | P0 |
| 27.2 | Buscar meu palpite — jogo sem palpite | GET | /jogos/:jogoId/meu-palpite | JWT | — | 404 | P0 |
| 27.3 | Buscar meu palpite — jogo inexistente | GET | /jogos/:jogoId/meu-palpite | JWT | — | 404 | P1 |
| 27.4 | Listar meus palpites | GET | /meus-palpites | JWT | — | 200, array | P0 |
| 27.5 | Listar meus palpites com filtro temporadaId | GET | /meus-palpites?temporadaId=xxx | JWT | — | 200, filtrado | P1 |
| 27.6 | Listar meus palpites — sem palpites | GET | /meus-palpites | JWT | — | 200, array vazio | P1 |

---

## 28. Palpites — Visibilidade no Grupo

### Pré-condição: grupo com membros, jogos com palpites

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 28.1 | Jogo FINALIZADO → retorna palpites de todos os membros | GET | /grupos/:grupoId/jogos/:jogoId/palpites | JWT+Membro | — | 200, array com todos | P0 |
| 28.2 | Jogo AGENDADO → retorna apenas meu palpite | GET | /grupos/:grupoId/jogos/:jogoId/palpites | JWT+Membro | — | 200, array com 1 ou 0 | P0 |
| 28.3 | Jogo EM_ANDAMENTO → retorna apenas meu palpite | GET | /grupos/:grupoId/jogos/:jogoId/palpites | JWT+Membro | — | 200, array com 1 ou 0 | P1 |
| 28.4 | Jogo inexistente | GET | /grupos/:grupoId/jogos/:jogoId/palpites | JWT+Membro | — | 404 | P1 |
| 28.5 | Não membro do grupo → 403 | GET | /grupos/:grupoId/jogos/:jogoId/palpites | JWT | — | 403 | P0 |

---

## 29. Palpite Dobrado — Ativação e Desativação

### Pré-condição: grupo com permitirPalpiteDobrado=true, membro com saldo > 0, jogo AGENDADO

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 29.1 | Ativar dobro com sucesso | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 201, PalpiteDobrado criado | P0 |
| 29.2 | Ativar dobro — jogo não AGENDADO | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 400 | P0 |
| 29.3 | Ativar dobro — saldo zero | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 400 | P0 |
| 29.4 | Ativar dobro — já ativo | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 409 | P0 |
| 29.5 | Ativar dobro — grupo sem dobro habilitado | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 400 | P0 |
| 29.6 | Ativar dobro — não membro | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT | — | 403 | P1 |
| 29.7 | Ativar dobro — jogo inexistente | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 404 | P1 |
| 29.8 | Ativar dobro — grupo inexistente | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT | — | 404 | P1 |
| 29.9 | Desativar dobro com sucesso | DELETE | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 200 | P0 |
| 29.10 | Desativar dobro — jogo não AGENDADO | DELETE | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 400 | P0 |
| 29.11 | Desativar dobro — sem dobro ativo | DELETE | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 404 | P0 |
| 29.12 | Ativar + desativar → saldo preservado | POST+DELETE | — | JWT+Membro | — | saldo volta ao original | P0 |

---

## 30. Token Dobro — Saldo e Histórico

### Pré-condição: grupo com permitirPalpiteDobrado=true, membro do grupo

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 30.1 | Consultar saldo | GET | /grupos/:grupoId/tokens-dobro/saldo | JWT+Membro | — | 200, `{ saldo: N }` | P0 |
| 30.2 | Consultar saldo — grupo sem dobro | GET | /grupos/:grupoId/tokens-dobro/saldo | JWT+Membro | — | 200, `{ saldo: 0 }` | P1 |
| 30.3 | Consultar saldo — não membro | GET | /grupos/:grupoId/tokens-dobro/saldo | JWT | — | 403 | P1 |
| 30.4 | Consultar histórico | GET | /grupos/:grupoId/tokens-dobro/historico | JWT+Membro | — | 200, array com tipo/motivo | P0 |
| 30.5 | Consultar histórico — não membro | GET | /grupos/:grupoId/tokens-dobro/historico | JWT | — | 403 | P1 |

---

## 31. Configuração de Palpite Dobrado

### Pré-condição: grupo existente

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 31.1 | Habilitar dobro (admin) | PATCH | /grupos/:grupoId/configuracao-dobro | JWT+Admin | `{ permitirPalpiteDobrado: true }` | 200 | P0 |
| 31.2 | Desabilitar dobro (admin) | PATCH | /grupos/:grupoId/configuracao-dobro | JWT+Admin | `{ permitirPalpiteDobrado: false }` | 200 | P0 |
| 31.3 | Configurar dobro (membro não admin) → 403 | PATCH | /grupos/:grupoId/configuracao-dobro | JWT+Membro | `{ permitirPalpiteDobrado: true }` | 403 | P0 |
| 31.4 | Desabilitar dobro preserva tokens existentes | PATCH | /grupos/:grupoId/configuracao-dobro | JWT+Admin | `{ permitirPalpiteDobrado: false }` | 200, saldo mantido | P1 |
| 31.5 | Desabilitar dobro impede novas ativações | POST | /grupos/:grupoId/jogos/:jogoId/dobro | JWT+Membro | — | 400 | P1 |

---

## 32. Ranking — Consulta

### Pré-condição: grupo com membros, jogos finalizados com palpites

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 32.1 | Ranking geral do grupo | GET | /grupos/:grupoId/ranking/geral | JWT+Membro | — | 200, array ordenado por pontuação DESC | P0 |
| 32.2 | Ranking geral — grupo inexistente | GET | /grupos/:grupoId/ranking/geral | JWT | — | 404 | P1 |
| 32.3 | Ranking geral — não membro | GET | /grupos/:grupoId/ranking/geral | JWT | — | 403 | P0 |
| 32.4 | Ranking geral — sem jogos finalizados | GET | /grupos/:grupoId/ranking/geral | JWT+Membro | — | 200, todos com 0 pontos | P1 |
| 32.5 | Ranking por fase | GET | /grupos/:grupoId/ranking/fases/:faseId | JWT+Membro | — | 200, array ordenado | P0 |
| 32.6 | Ranking por fase — fase inexistente | GET | /grupos/:grupoId/ranking/fases/:faseId | JWT+Membro | — | 404 | P1 |
| 32.7 | Ranking por fase — sem jogos finalizados na fase | GET | /grupos/:grupoId/ranking/fases/:faseId | JWT+Membro | — | 200, todos com 0 pontos | P1 |

---

## 33. Ranking — Detalhamento por Jogo

### Pré-condição: grupo com membros, jogo existente

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 33.1 | Detalhamento jogo FINALIZADO | GET | /grupos/:grupoId/ranking/jogos/:jogoId | JWT+Membro | — | 200, array com categoriaAcerto, pontosBase, pontosFinais | P0 |
| 33.2 | Detalhamento jogo não FINALIZADO → pontuação null | GET | /grupos/:grupoId/ranking/jogos/:jogoId | JWT+Membro | — | 200, pontosBase/pontosFinais null | P0 |
| 33.3 | Detalhamento — jogo inexistente | GET | /grupos/:grupoId/ranking/jogos/:jogoId | JWT+Membro | — | 404 | P1 |
| 33.4 | Detalhamento — não membro | GET | /grupos/:grupoId/ranking/jogos/:jogoId | JWT | — | 403 | P1 |
| 33.5 | Detalhamento — membro sem palpite aparece com null | GET | /grupos/:grupoId/ranking/jogos/:jogoId | JWT+Membro | — | 200, palpite null, 0 pontos | P1 |
| 33.6 | Detalhamento — flag dobrado=true quando PalpiteDobrado ativo | GET | /grupos/:grupoId/ranking/jogos/:jogoId | JWT+Membro | — | 200, dobrado=true, multiplicador=2 | P1 |

---

## 34. Ranking — Processamento de Pontuação

### Pré-condição: jogo FINALIZADO, grupo com membros e palpites

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 34.1 | Processar pontuação (admin) | POST | /grupos/:grupoId/ranking/processar-jogo/:jogoId | JWT+Admin | — | 200, `{ mensagem }` | P0 |
| 34.2 | Processar pontuação (membro não admin) → 403 | POST | /grupos/:grupoId/ranking/processar-jogo/:jogoId | JWT+Membro | — | 403 | P0 |
| 34.3 | Processar jogo não FINALIZADO → 400 | POST | /grupos/:grupoId/ranking/processar-jogo/:jogoId | JWT+Admin | — | 400 | P0 |
| 34.4 | Processar jogo inexistente → 404 | POST | /grupos/:grupoId/ranking/processar-jogo/:jogoId | JWT+Admin | — | 404 | P1 |
| 34.5 | Processar 2x (idempotência) → sem duplicar tokens | POST | /grupos/:grupoId/ranking/processar-jogo/:jogoId | JWT+Admin | — | 200, tokens não duplicados | P0 |

---

## 35. Ranking — Pontuação e Desempate

### Pré-condição: jogo FINALIZADO com placar 2x1

| # | Cenário | Palpite | Esperado | Prioridade |
|---|---------|---------|----------|------------|
| 35.1 | Acerto em cheio (2x1) | `{ golsCasa: 2, golsFora: 1 }` | 10 pontos, categoria ACERTO_EM_CHEIO | P0 |
| 35.2 | Acerto de resultado (3x1, vitória casa) | `{ golsCasa: 3, golsFora: 1 }` | 5 pontos, categoria ACERTO_DE_RESULTADO | P0 |
| 35.3 | Acerto de gols um time (2x3, acertou golsCasa) | `{ golsCasa: 2, golsFora: 3 }` | 3 pontos, categoria ACERTO_DE_GOLS_UM_TIME | P0 |
| 35.4 | Erro total (0x3) | `{ golsCasa: 0, golsFora: 3 }` | 0 pontos, categoria ERRO_TOTAL | P0 |
| 35.5 | Sem palpite | — | 0 pontos, categoria null | P0 |
| 35.6 | Multiplicador dobro (acerto em cheio + dobro) | `{ golsCasa: 2, golsFora: 1 }` + PalpiteDobrado | 20 pontos (10 * 2) | P0 |
| 35.7 | Desempate: mais acertos em cheio primeiro | — | Membro com mais acertos em cheio na frente | P1 |
| 35.8 | Desempate: mais acertos de resultado segundo | — | Segundo critério aplicado | P1 |
| 35.9 | Empate total → mesma posição, ordem alfabética | — | Mesma posição, nome ASC | P1 |

---

## 36. Ranking — Concessão de TokenDobro

### Pré-condição: grupo com permitirPalpiteDobrado=true

| # | Cenário | Esperado | Prioridade |
|---|---------|----------|------------|
| 36.1 | Acerto em cheio → concede 1 token ACERTO_EM_CHEIO | Token criado com motivo correto | P0 |
| 36.2 | Fase encerrada → token PRIMEIRO_RANKING ao 1º | Token criado | P0 |
| 36.3 | Fase encerrada → token ULTIMO_RANKING ao último | Token criado | P0 |
| 36.4 | Empate no 1º lugar → todos empatados recebem token | Múltiplos tokens | P1 |
| 36.5 | Grupo sem dobro → nenhum token concedido | 0 tokens | P0 |
| 36.6 | Fase com apenas jogos cancelados → sem tokens de posição | 0 tokens posição | P1 |
| 36.7 | Idempotência → processar 2x não duplica tokens | 1 token por conquista | P0 |

---

## 37. Validação de DTOs — Palpites

| # | Cenário | Método | Rota | Auth | Body | Esperado | Prioridade |
|---|---------|--------|------|------|------|----------|------------|
| 37.1 | Criar sem golsCasa | POST | /jogos/:jogoId/palpites | JWT | `{ golsFora: 1 }` | 400 | P1 |
| 37.2 | Criar sem golsFora | POST | /jogos/:jogoId/palpites | JWT | `{ golsCasa: 1 }` | 400 | P1 |
| 37.3 | Criar com gols negativos | POST | /jogos/:jogoId/palpites | JWT | `{ golsCasa: -1, golsFora: 0 }` | 400 | P1 |
| 37.4 | Criar com gols decimal | POST | /jogos/:jogoId/palpites | JWT | `{ golsCasa: 1.5, golsFora: 0 }` | 400 | P2 |
| 37.5 | Criar com body vazio | POST | /jogos/:jogoId/palpites | JWT | `{}` | 400 | P1 |
| 37.6 | Configurar dobro sem campo | PATCH | /grupos/:grupoId/configuracao-dobro | JWT+Admin | `{}` | 400 | P1 |
| 37.7 | Configurar dobro com valor não booleano | PATCH | /grupos/:grupoId/configuracao-dobro | JWT+Admin | `{ permitirPalpiteDobrado: 'sim' }` | 400 | P2 |

---

## Resumo Final

| Módulo | Total | P0 | P1 | P2 |
|--------|-------|----|----|-----|
| Cenários anteriores (1-25) | 184 | — | — | — |
| Palpites CRUD | 14 | 9 | 5 | 0 |
| Palpites Consulta | 6 | 2 | 4 | 0 |
| Palpites Visibilidade | 5 | 3 | 2 | 0 |
| Palpite Dobrado | 12 | 8 | 4 | 0 |
| Token Dobro | 5 | 2 | 3 | 0 |
| Configuração Dobro | 5 | 3 | 2 | 0 |
| Ranking Consulta | 7 | 3 | 4 | 0 |
| Ranking Detalhamento | 6 | 2 | 4 | 0 |
| Ranking Processamento | 5 | 3 | 2 | 0 |
| Ranking Pontuação/Desempate | 9 | 6 | 3 | 0 |
| Ranking TokenDobro | 7 | 4 | 3 | 0 |
| Validação DTOs Palpites | 7 | 0 | 5 | 2 |
| **TOTAL** | **272** | — | — | — |

---
status: completed
---

# Mata-Mata Automático — Requisitos

## Contexto

O sistema precisa montar automaticamente o chaveamento das fases eliminatórias da Copa do Mundo 2026 conforme os jogos são finalizados, sem intervenção manual.

## Regras de Negócio

### Criação de Jogos

1. QUANDO um grupo é finalizado (6 jogos FINALIZADOS), o backend DEVE criar os jogos de 16 avos que envolvem o 1º e 2º desse grupo
2. QUANDO um jogo de 16 avos é finalizado, o backend DEVE criar o jogo de oitavas correspondente com o vencedor
3. QUANDO um jogo de oitavas é finalizado, o backend DEVE criar o jogo de quartas correspondente com o vencedor
4. A mesma lógica se aplica para semifinais, 3º lugar e final
5. Um jogo PODE ser criado com apenas 1 time definido (o outro como TBD) — quando o adversário depende de outro resultado
6. QUANDO o adversário é definido, o jogo existente DEVE ser atualizado (TBD → time real)
7. Posições de "melhor 3º colocado" (3ABCDF, etc.) só são resolvidas quando TODOS os grupos terminarem

### Integração com API do GE

8. QUANDO a API do GE publicar jogos de uma fase eliminatória, o sistema DEVE:
   - Fazer match com jogos já existentes no banco (por horário, tolerância 30min)
   - Vincular o `externoId` da API ao jogo local
   - Atualizar times se a API tem dados mais recentes
   - NÃO duplicar jogos que já existem
9. Se a API do GE não tem dados, o fallback é a classificação local + constante de chaveamento FIFA
10. Se a API do GE tem dados E o jogo já existe no banco, a API tem prioridade (pode corrigir horários, times)

### Frontend

11. A aba "16 Avos de Final" DEVE aparecer quando pelo menos 1 grupo está completo (6 jogos finalizados)
12. A aba "Oitavas de Final" DEVE aparecer quando pelo menos 1 jogo de 16 avos está finalizado
13. A mesma regra se aplica para as fases seguintes
14. O frontend DEVE montar a estrutura visual completa do chaveamento (16 slots para 16 avos, 8 para oitavas, etc.)
15. Jogos com TBD: mostrar a posição do chaveamento ("1ºF", "3º ABCDF") + "A definir" — input desabilitado
16. Jogos com ambos os times reais: habilitar palpite

## Constante de Chaveamento

O `COPA_CHAVEAMENTO_16AVOS` contém a regra FIFA de quem joga contra quem. É fixo por edição da Copa.
Para oitavas em diante, o chaveamento é: vencedor do jogo X vs vencedor do jogo Y (bracket padrão).

## Estado Atual (implementado)

- ✅ Backend cria jogos de 16 avos quando grupo termina (via classificação)
- ✅ Backend atualiza TBD → time real conforme mais grupos terminam
- ✅ Backend generalizado para todas as fases eliminatórias — `propagarVencedoresParaProximaFase()` percorre pares consecutivos de fases mata-mata
- ✅ Constantes de bracket para oitavas, quartas, semis, 3º lugar e final (`COPA_BRACKET_*` em `jogos.constants.ts`)
- ✅ Quando jogo de mata-mata é finalizado, o vencedor é propagado para a próxima fase (cria jogo ou atualiza TBD)
- ✅ Sync automática detecta finalizações e dispara tanto `preencherProximaFaseEliminatoria` quanto `propagarVencedoresParaProximaFase`
- ✅ Match com API do GE por horário quando disponível (`tentarPreencherViaApi`)
- ✅ Frontend mostra abas dinamicamente — `adicionarEliminatoriasComJogos()` exibe fases que têm jogos; `adicionarProximaEliminatoriaEmBreve()` exibe a próxima fase quando a anterior tem jogo finalizado
- ✅ Frontend mostra posição do chaveamento em jogos com TBD (ex: "1ºE", "3º ABCDF")

## Pendente

_(Nenhum item pendente)_

## Decisões Arquiteturais

### Resolução de 3ºs colocados → delegada à API do GE

A atribuição dos melhores 3ºs colocados aos slots do bracket exige uma tabela oficial da FIFA com 495 combinações possíveis. Como a Copa está em andamento e a API do GE publica os jogos de 16 avos com os times já definidos (antes mesmo dos 12 grupos terminarem), a resolução é delegada à API.

`resolverPosicao()` retorna `null` para posições tipo `3ABCDF` — o jogo fica com TBD até a API do GE fornecer o time real via `tentarPreencherViaApi()`. Isso é intencional e suficiente para o cenário de produção.

## Dívida Técnica

- `obterBracketParaFase()` usa `nome.includes('oitavas')`, `nome.includes('quartas')`, etc. — frágil se nomes de fase mudarem no banco. Idealmente usar `slugExterno` da fase (depende da spec de Unificação de Campeonatos)

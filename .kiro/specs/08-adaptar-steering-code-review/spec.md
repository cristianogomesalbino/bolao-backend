# Feature: Adaptar Steering de Code Review

## Problema

O steering `code-review-rd-sesi.md` foi escrito para um projeto com arquitetura diferente (Clean Architecture + Vertical Slices completo, Zod, Vitest, CASL, EnvService, etc.). Aplicá-lo no estado atual gera falsos positivos e confusão.

Referências inexistentes no projeto:
- `docs/ai/AGENTS_RULES.md`
- `docs/ai/AGENTS.md`
- `src/infra/env/env.service.ts`
- `src/core/errors/exception.error.ts`
- `src/modules/management/user/` (Golden Files)
- `BaseUseCase`, `RepositoryConfig`, `CASL`, `Zod`, `Vitest`

## Objetivo

Criar uma versão do steering de code review alinhada com a arquitetura atual do projeto, mantendo os princípios de qualidade mas ajustando os checks para o que realmente existe.

## Requisitos

### Requisito 1: Atualizar referências de arquitetura
- Substituir referências a Use Cases por Services
- Substituir referências a Zod por class-validator
- Substituir referências a Vitest por Jest (ou pela ferramenta atual)
- Remover referências a CASL, EnvService, RepositoryConfig
- Remover referências a Vertical Slices e Golden Files inexistentes

### Requisito 2: Atualizar checks de segurança
- Manter check de `process.env` mas ajustar exceções para o projeto atual (usa ConfigModule)
- Manter checks de `$queryRaw` / `$executeRaw`
- Ajustar check de `@Public()` para o padrão atual de guards

### Requisito 3: Atualizar checks de arquitetura
- Ajustar para a estrutura flat atual (service + controller + dto)
- Manter princípios: controllers thin, services com lógica, transações quando necessário
- Remover checks de barrel exports, APP_GUARD (se ainda não migrado)

### Requisito 4: Atualizar convenções de nomenclatura
- Refletir os padrões reais do projeto (português para entidades, inglês para NestJS patterns)
- Ajustar tabela de nomenclatura de arquivos para a estrutura atual

### Requisito 5: Atualizar referências de documentação
- Remover referências a arquivos inexistentes
- Apontar para os arquivos reais do projeto

### Requisito 6: Manter evolução
- Adicionar seção "Roadmap de Arquitetura" indicando as features planejadas (specs 01-07)
- Indicar que os checks serão atualizados conforme as features forem implementadas

## Tarefas

- [ ] Auditar todas as referências no steering atual
- [ ] Listar referências inexistentes vs existentes
- [ ] Reescrever seções de arquitetura para refletir estado atual
- [ ] Reescrever seções de segurança
- [ ] Reescrever convenções de nomenclatura
- [ ] Atualizar comandos de verificação
- [ ] Atualizar tabela de cobertura de testes
- [ ] Adicionar seção de roadmap de arquitetura
- [ ] Remover referências a arquivos/padrões inexistentes
- [ ] Revisar o documento final para consistência

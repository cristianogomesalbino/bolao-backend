# Feature: Domain Errors Específicos

## Problema

O projeto usa `ErrorFactory` para lançar exceções genéricas (`ErrorFactory.notFound('mensagem')`). Isso funciona, mas não é expressivo: não dá pra saber pelo tipo do erro o que aconteceu, e dificulta testes específicos (`expect(...).toThrow(GrupoNaoEncontradoError)`).

## Objetivo

Criar classes de erro específicas por domínio que encapsulam o status HTTP e a mensagem. Manter `ErrorFactory` como fallback para erros genéricos, mas preferir domain errors nos services.

## Requisitos

### Requisito 1: Criar classe base
```typescript
// src/common/errors/domain.error.ts
export abstract class DomainError extends Error {
  abstract readonly statusCode: number;
}
```

### Requisito 2: Criar erros por módulo
Exemplos:
- `src/modules/usuarios/errors/usuario-nao-encontrado.error.ts`
- `src/modules/usuarios/errors/email-ja-cadastrado.error.ts`
- `src/modules/grupos/errors/grupo-nao-encontrado.error.ts`
- `src/modules/grupos/errors/codigo-convite-invalido.error.ts`
- `src/modules/grupo-usuario/errors/usuario-ja-no-grupo.error.ts`
- `src/modules/temporadas/errors/temporada-nao-encontrada.error.ts`
- `src/modules/campeonatos/errors/campeonato-nao-encontrado.error.ts`

### Requisito 3: Padrão do erro
```typescript
export class UsuarioNaoEncontradoError extends DomainError {
  readonly statusCode = 404;
  constructor() {
    super('Usuário não encontrado');
  }
}
```

### Requisito 4: Criar filter para DomainError
- Criar `src/common/filters/domain-exception.filter.ts`
- Capturar `DomainError` e retornar resposta no formato padrão `{ erros: [...] }`
- Registrar o filter globalmente no `main.ts`

### Requisito 5: Substituir nos services
- Substituir `throw ErrorFactory.notFound(...)` por `throw new EntidadeNaoEncontradaError()`
- Manter `ErrorFactory` para erros que não justificam uma classe própria

### Requisito 6: Atualizar testes
- Usar `expect(...).toThrow(UsuarioNaoEncontradoError)` nos testes
- Mais expressivo e menos frágil que comparar mensagens de string

## Tarefas

- [ ] Criar classe base DomainError
- [ ] Criar DomainExceptionFilter
- [ ] Registrar filter no main.ts
- [ ] Criar erros do módulo usuarios
- [ ] Criar erros do módulo campeonatos
- [ ] Criar erros do módulo temporadas
- [ ] Criar erros do módulo grupos
- [ ] Criar erros do módulo grupo-usuario
- [ ] Substituir ErrorFactory por domain errors nos services
- [ ] Atualizar testes para usar domain errors
- [ ] Verificar que as respostas de erro mantêm o formato padrão

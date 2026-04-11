# Feature: Extrair Constantes por Módulo

## Problema

O projeto usa strings hardcoded em vários lugares: nomes de roles (`'ADMIN'`, `'MEMBER'`), mensagens de erro, nomes de módulos no Swagger, etc. Isso dificulta manutenção e gera inconsistências.

## Objetivo

Criar um arquivo de constantes por módulo (`*.constants.ts`) centralizando strings repetidas: mensagens de erro, roles, nomes de tags Swagger, e mensagens de validação.

## Requisitos

### Requisito 1: Criar constantes para cada módulo existente
- Criar `src/modules/auth/auth.constants.ts`
- Criar `src/modules/usuarios/usuarios.constants.ts`
- Criar `src/modules/campeonatos/campeonatos.constants.ts`
- Criar `src/modules/temporadas/temporadas.constants.ts`
- Criar `src/modules/grupos/grupos.constants.ts`
- Criar `src/modules/grupo-usuario/grupo-usuario.constants.ts`

### Requisito 2: Estrutura padrão das constantes
Cada arquivo deve seguir o padrão:
```typescript
export const ModuloConstants = {
  TAG: 'NomeDoModulo',           // Tag do Swagger
  MENSAGENS: {
    NAO_ENCONTRADO: '...',
    JA_EXISTE: '...',
    CRIADO: '...',
    ATUALIZADO: '...',
    REMOVIDO: '...',
  },
} as const;
```

### Requisito 3: Substituir strings hardcoded
- Substituir todas as strings hardcoded nos controllers, services e DTOs pelas constantes correspondentes
- Manter mensagens em português brasileiro

### Requisito 4: Constantes globais de roles
- Criar `src/common/constants/roles.constants.ts` com os valores de `Perfil` e `GrupoRole` usados nos guards e services

## Tarefas

- [ ] Mapear todas as strings hardcoded nos módulos existentes
- [ ] Criar arquivo de constantes para cada módulo
- [ ] Criar constantes globais de roles
- [ ] Substituir strings hardcoded por referências às constantes nos controllers
- [ ] Substituir strings hardcoded por referências às constantes nos services
- [ ] Substituir strings hardcoded por referências às constantes nos DTOs
- [ ] Verificar que os testes continuam passando

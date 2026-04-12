# Documento de Requisitos — Extrair Constantes por Módulo

## Introdução

O projeto possui strings hardcoded espalhadas por controllers, services e guards: tags Swagger, mensagens de erro e valores de roles. Isso dificulta manutenção, gera inconsistências e torna renomeações arriscadas. Esta feature centraliza todas essas strings em arquivos de constantes por módulo.

## Glossário

- **Sistema**: A API backend NestJS do Bolão
- **Módulo**: Cada pasta em `src/modules/` (auth, usuarios, campeonatos, temporadas, grupos, grupo-usuario)
- **Arquivo_de_Constantes**: Arquivo `*.constants.ts` dentro de cada módulo que centraliza strings
- **Constantes_Globais**: Arquivo em `src/common/constants/` com valores compartilhados entre módulos
- **Tag_Swagger**: String usada no decorator `@ApiTags()` dos controllers
- **Mensagem_de_Erro**: String passada para métodos do `ErrorFactory` nos services e guards
- **Mensagem_de_Resposta**: String em objetos de retorno como `{ mensagem: '...' }`
- **Role**: Valor de papel dentro de um grupo (`ADMIN`, `MEMBER`) ou perfil global (`SUPER_ADMIN`, `USER`)

## Requisitos

### Requisito 1: Criar arquivo de constantes por módulo

**User Story:** Como desenvolvedor, quero que cada módulo tenha um arquivo de constantes centralizado, para evitar strings hardcoded e facilitar manutenção.

#### Critérios de Aceitação

1. THE Sistema SHALL possuir um Arquivo_de_Constantes (`{modulo}.constants.ts`) em cada um dos 6 módulos existentes: auth, usuarios, campeonatos, temporadas, grupos, grupo-usuario
2. THE Arquivo_de_Constantes SHALL exportar um objeto `as const` contendo as propriedades: `TAG` (Tag_Swagger) e `MENSAGENS` (Mensagens_de_Erro e Mensagens_de_Resposta)
3. THE Arquivo_de_Constantes SHALL conter todas as strings que eram hardcoded no controller, service e guard do respectivo módulo

### Requisito 2: Criar constantes globais de roles

**User Story:** Como desenvolvedor, quero constantes globais para os valores de Role, para que guards e services referenciem valores centralizados em vez de strings soltas.

#### Critérios de Aceitação

1. THE Sistema SHALL possuir um arquivo `src/common/constants/roles.constants.ts` exportando as constantes de Perfil (`SUPER_ADMIN`, `USER`) e GrupoRole (`ADMIN`, `MEMBER`)
2. THE Constantes_Globais SHALL ser usadas em todos os guards, services e decorators que referenciam valores de Role

### Requisito 3: Substituir strings hardcoded nos controllers

**User Story:** Como desenvolvedor, quero que os controllers usem constantes em vez de strings literais, para garantir consistência nas tags Swagger e descrições.

#### Critérios de Aceitação

1. WHEN um controller usa `@ApiTags()`, THE controller SHALL referenciar a constante `TAG` do Arquivo_de_Constantes do módulo
2. WHEN um controller usa `@GroupRoles()`, THE controller SHALL referenciar as Constantes_Globais de Role em vez de strings literais

### Requisito 4: Substituir strings hardcoded nos services e guards

**User Story:** Como desenvolvedor, quero que services e guards usem constantes para mensagens de erro e roles, para facilitar alterações futuras.

#### Critérios de Aceitação

1. WHEN um service chama `ErrorFactory`, THE service SHALL passar uma constante do Arquivo_de_Constantes em vez de string literal
2. WHEN um service retorna um objeto com campo `mensagem`, THE service SHALL usar uma constante do Arquivo_de_Constantes
3. WHEN um guard compara valores de Role, THE guard SHALL usar as Constantes_Globais de Role
4. WHEN um guard chama `ErrorFactory`, THE guard SHALL passar uma constante do Arquivo_de_Constantes correspondente

### Requisito 5: Preservar comportamento existente

**User Story:** Como desenvolvedor, quero que a extração de constantes não altere o comportamento da aplicação, para garantir que nenhuma funcionalidade quebre.

#### Critérios de Aceitação

1. THE Sistema SHALL manter os mesmos valores de string após a substituição por constantes
2. THE Sistema SHALL manter todos os testes existentes passando após a refatoração
3. IF um valor de string for alterado em uma constante, THEN THE Sistema SHALL refletir a alteração em todos os pontos que referenciam a constante

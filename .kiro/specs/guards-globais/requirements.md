# Documento de Requisitos — Guards Globais (APP_GUARD)

## Introdução

Atualmente cada controller aplica `@UseGuards(JwtAuthGuard)` manualmente. Isso é propenso a erros: esquecer o decorator expõe a rota publicamente. Este feature registra o `JwtAuthGuard` como guard global via `APP_GUARD`, tornando todas as rotas protegidas por padrão. Rotas públicas são marcadas explicitamente com um decorator `@Public()`.

## Glossário

- **JwtAuthGuard**: Guard de autenticação baseado em JWT/Passport que valida o access token
- **APP_GUARD**: Provider global do NestJS que aplica um guard a todas as rotas automaticamente
- **Decorator_Public**: Decorator customizado `@Public()` que marca uma rota como pública via metadata `isPublic`
- **Reflector**: Utilitário do NestJS para ler metadata definida por decorators
- **AppModule**: Módulo raiz da aplicação NestJS
- **Rota_Pública**: Rota que não exige autenticação (login, refresh, criação de conta, health check)
- **GroupRoleGuard**: Guard de autorização que verifica role do usuário dentro de um grupo
- **SelfOrAdminGuard**: Guard de autorização que verifica se o usuário é o próprio recurso ou SUPER_ADMIN

## Requisitos

### Requisito 1: Criar decorator @Public()

**User Story:** Como desenvolvedor, quero um decorator `@Public()` para marcar rotas que não exigem autenticação, de forma que o guard global as ignore.

#### Critérios de Aceitação

1. THE Decorator_Public SHALL definir a metadata `isPublic` com valor `true` na rota decorada
2. WHEN o Decorator_Public for aplicado a um método de controller, THE Reflector SHALL retornar `true` para a chave `isPublic` nesse handler
3. THE Decorator_Public SHALL ser exportado do arquivo `src/common/decorators/public.decorator.ts`

### Requisito 2: Atualizar JwtAuthGuard para suportar rotas públicas

**User Story:** Como desenvolvedor, quero que o JwtAuthGuard verifique a metadata `isPublic` antes de exigir autenticação, de forma que rotas marcadas com `@Public()` sejam acessíveis sem token.

#### Critérios de Aceitação

1. WHEN uma requisição chega a uma rota marcada com Decorator_Public, THE JwtAuthGuard SHALL permitir o acesso sem validar o token JWT
2. WHEN uma requisição chega a uma rota sem Decorator_Public, THE JwtAuthGuard SHALL validar o token JWT normalmente
3. IF o token JWT for inválido ou ausente em uma rota sem Decorator_Public, THEN THE JwtAuthGuard SHALL retornar erro 401 Unauthorized
4. THE JwtAuthGuard SHALL usar o Reflector para ler a metadata `isPublic` do handler e da classe

### Requisito 3: Registrar JwtAuthGuard como guard global

**User Story:** Como desenvolvedor, quero que o JwtAuthGuard seja aplicado globalmente via APP_GUARD, de forma que todas as rotas sejam protegidas por padrão sem necessidade de decorator manual.

#### Critérios de Aceitação

1. THE AppModule SHALL registrar o JwtAuthGuard como provider global usando o token `APP_GUARD`
2. WHEN uma nova rota for criada sem nenhum decorator de guard, THE JwtAuthGuard SHALL proteger essa rota automaticamente
3. THE AppModule SHALL manter os imports de módulos existentes inalterados

### Requisito 4: Marcar rotas públicas com @Public()

**User Story:** Como desenvolvedor, quero que as rotas que não exigem autenticação sejam marcadas com `@Public()`, de forma que continuem acessíveis após a ativação do guard global.

#### Critérios de Aceitação

1. THE AuthController SHALL marcar a rota `POST /auth/login` com Decorator_Public
2. THE AuthController SHALL marcar a rota `POST /auth/refresh` com Decorator_Public
3. THE UsuariosController SHALL marcar a rota `POST /usuarios` (criação de conta) com Decorator_Public
4. THE AppController SHALL marcar a rota `GET /health` com Decorator_Public
5. WHEN uma requisição sem token chegar a uma Rota_Pública, THE JwtAuthGuard SHALL permitir o acesso

### Requisito 5: Remover @UseGuards(JwtAuthGuard) dos controllers

**User Story:** Como desenvolvedor, quero remover todos os `@UseGuards(JwtAuthGuard)` manuais dos controllers, de forma que não haja duplicação com o guard global.

#### Critérios de Aceitação

1. THE CampeonatosController SHALL remover o decorator `@UseGuards(JwtAuthGuard)` de nível de classe
2. THE TemporadasController SHALL remover o decorator `@UseGuards(JwtAuthGuard)` de nível de classe
3. THE GruposController SHALL remover o decorator `@UseGuards(JwtAuthGuard)` de nível de classe
4. THE GrupoUsuarioController SHALL remover o decorator `@UseGuards(JwtAuthGuard)` de nível de classe
5. THE UsuariosController SHALL remover o decorator `@UseGuards(JwtAuthGuard)` de nível de método nas rotas `GET /usuarios/me`, `GET /usuarios/:id`, `PATCH /usuarios/:id` e `DELETE /usuarios/:id`
6. WHEN um controller usar `@UseGuards(SelfOrAdminGuard)`, THE controller SHALL manter esse guard inalterado
7. WHEN um controller usar `@UseGuards(GroupRoleGuard)`, THE controller SHALL manter esse guard inalterado

### Requisito 6: Manter logout como rota protegida

**User Story:** Como desenvolvedor, quero que a rota de logout continue exigindo autenticação, de forma que apenas usuários autenticados possam invalidar seus tokens.

#### Critérios de Aceitação

1. THE AuthController SHALL manter a rota `POST /auth/logout` sem o Decorator_Public
2. WHEN uma requisição sem token chegar a `POST /auth/logout`, THE JwtAuthGuard SHALL retornar erro 401 Unauthorized

# Documento de Requisitos — Domain Errors

## Introdução

Os services do projeto lançam exceções via `ErrorFactory`, que encapsula `HttpException` do NestJS com mensagens genéricas. Isso acopla a camada de domínio ao HTTP e dificulta testes tipados. Este módulo introduz classes de erro de domínio específicas (`DomainError` → subclasses por contexto), um `DomainExceptionFilter` global para converter esses erros no formato padrão da API, e migra todos os services para usar domain errors no lugar de `ErrorFactory`.

## Glossário

- **DomainError**: Classe abstrata base que estende `Error`, contendo `mensagem` e `statusCode` para representar erros de domínio sem depender de classes HTTP do NestJS
- **DomainExceptionFilter**: Exception filter global do NestJS que captura instâncias de `DomainError` e retorna a resposta HTTP no formato padrão `{ erros: [{ mensagens: [...] }] }`
- **ErrorFactory**: Classe utilitária existente que cria `HttpException` do NestJS com formato padronizado — será mantida como fallback para erros genéricos
- **Service**: Classe NestJS responsável pela lógica de negócio e acesso ao banco via Prisma
- **Formato_Padrao_Erro**: Estrutura JSON `{ erros: [{ mensagens: [string] }] }` usada em todas as respostas de erro da API

## Requisitos

### Requisito 1: Criar classe base DomainError

**User Story:** Como desenvolvedor, quero uma classe base abstrata para erros de domínio, para que os services lancem exceções tipadas sem depender de classes HTTP do NestJS.

#### Critérios de Aceitação

1. THE DomainError SHALL ser uma classe abstrata que estende `Error`, contendo as propriedades `mensagem` (string) e `statusCode` (number)
2. THE DomainError SHALL definir um `name` igual ao nome da classe concreta para facilitar identificação em logs e testes
3. WHEN uma subclasse de DomainError for instanciada, THE subclasse SHALL herdar `mensagem` e `statusCode` da classe base sem necessidade de redefinir a estrutura

### Requisito 2: Criar classes de erro específicas por domínio

**User Story:** Como desenvolvedor, quero classes de erro específicas para cada cenário de negócio, para que os services expressem erros de forma semântica e os testes possam verificar o tipo exato do erro.

#### Critérios de Aceitação

1. THE módulo de erros SHALL fornecer as seguintes classes de erro para o módulo Auth: `CredenciaisInvalidasError` (401), `RefreshNaoFornecidoError` (401), `RefreshInvalidoError` (401), `RefreshExpiradoError` (401)
2. THE módulo de erros SHALL fornecer as seguintes classes de erro para o módulo Usuarios: `UsuarioNaoEncontradoError` (404), `EmailJaCadastradoError` (409)
3. THE módulo de erros SHALL fornecer as seguintes classes de erro para o módulo Temporadas: `CampeonatoNaoEncontradoError` (404)
4. THE módulo de erros SHALL fornecer as seguintes classes de erro para o módulo Grupos: `TemporadaNaoEncontradaError` (404), `GrupoNaoEncontradoError` (404), `DesativeAntesDeExcluirError` (400)
5. THE módulo de erros SHALL fornecer as seguintes classes de erro para o módulo GrupoUsuario: `CodigoConviteInvalidoError` (404), `GrupoInativoError` (400), `JaEstaNoGrupoError` (409), `LimiteParticipantesError` (400), `UnicoAdminError` (400)
6. WHEN uma classe de erro específica for instanciada sem argumentos, THE classe SHALL usar a mensagem padrão correspondente da constante MENSAGENS do módulo
7. FOR ALL classes de erro específicas, THE classe SHALL estender DomainError e definir o `statusCode` correspondente ao tipo de erro (400, 401, 404 ou 409)

### Requisito 3: Criar DomainExceptionFilter

**User Story:** Como desenvolvedor, quero um exception filter global que capture DomainError e retorne no formato padrão da API, para que a migração para domain errors seja transparente para os clientes.

#### Critérios de Aceitação

1. THE DomainExceptionFilter SHALL ser registrado como exception filter global via `APP_FILTER` no AppModule
2. WHEN o DomainExceptionFilter capturar uma instância de DomainError, THE DomainExceptionFilter SHALL retornar uma resposta HTTP com o `statusCode` do erro e body no Formato_Padrao_Erro: `{ erros: [{ mensagens: [mensagem] }] }`
3. WHEN uma exceção que não é instância de DomainError for lançada, THE DomainExceptionFilter SHALL ignorar a exceção e deixar os filters padrão do NestJS tratarem

### Requisito 4: Migrar services para usar domain errors

**User Story:** Como desenvolvedor, quero que todos os services usem domain errors no lugar de ErrorFactory, para que os erros de negócio sejam tipados e testáveis.

#### Critérios de Aceitação

1. WHEN o AuthService detectar credenciais inválidas, THE AuthService SHALL lançar `CredenciaisInvalidasError` em vez de `ErrorFactory.unauthorized()`
2. WHEN o AuthService detectar problemas com refresh token, THE AuthService SHALL lançar `RefreshNaoFornecidoError`, `RefreshInvalidoError` ou `RefreshExpiradoError` conforme o cenário, em vez de `ErrorFactory.unauthorized()`
3. WHEN o UsuariosService detectar email duplicado, THE UsuariosService SHALL lançar `EmailJaCadastradoError` em vez de `ErrorFactory.conflict()`
4. WHEN o UsuariosService detectar usuário inexistente ou inativo, THE UsuariosService SHALL lançar `UsuarioNaoEncontradoError` em vez de `ErrorFactory.notFound()`
5. WHEN o TemporadasService detectar campeonato inexistente, THE TemporadasService SHALL lançar `CampeonatoNaoEncontradoError` em vez de `ErrorFactory.notFound()`
6. WHEN o GruposService detectar temporada inexistente, THE GruposService SHALL lançar `TemporadaNaoEncontradaError` em vez de `ErrorFactory.notFound()`
7. WHEN o GruposService detectar grupo inexistente ou inativo, THE GruposService SHALL lançar `GrupoNaoEncontradoError` em vez de `ErrorFactory.notFound()`
8. WHEN o GruposService detectar tentativa de excluir grupo ativo, THE GruposService SHALL lançar `DesativeAntesDeExcluirError` em vez de `ErrorFactory.badRequest()`
9. WHEN o GrupoUsuarioService detectar código de convite inválido, THE GrupoUsuarioService SHALL lançar `CodigoConviteInvalidoError` em vez de `ErrorFactory.notFound()`
10. WHEN o GrupoUsuarioService detectar grupo inativo, THE GrupoUsuarioService SHALL lançar `GrupoInativoError` em vez de `ErrorFactory.badRequest()`
11. WHEN o GrupoUsuarioService detectar usuário já no grupo, THE GrupoUsuarioService SHALL lançar `JaEstaNoGrupoError` em vez de `ErrorFactory.conflict()`
12. WHEN o GrupoUsuarioService detectar limite de participantes atingido, THE GrupoUsuarioService SHALL lançar `LimiteParticipantesError` em vez de `ErrorFactory.badRequest()`
13. WHEN o GrupoUsuarioService detectar tentativa de sair sendo único admin, THE GrupoUsuarioService SHALL lançar `UnicoAdminError` em vez de `ErrorFactory.badRequest()`

### Requisito 5: Manter ErrorFactory como fallback

**User Story:** Como desenvolvedor, quero manter ErrorFactory disponível para erros genéricos que não justificam uma classe própria, para evitar over-engineering em cenários simples.

#### Critérios de Aceitação

1. THE ErrorFactory SHALL permanecer em `src/common/errors/error.factory.ts` sem alterações na interface pública
2. WHEN um erro genérico não tiver classe de domínio específica (ex: erros de guards de autorização), THE código SHALL continuar usando ErrorFactory

### Requisito 6: Atualizar testes para usar domain errors

**User Story:** Como desenvolvedor, quero que os testes verifiquem o tipo específico do erro lançado, para que mudanças acidentais em erros de negócio sejam detectadas.

#### Critérios de Aceitação

1. WHEN um teste verificar erro de negócio, THE teste SHALL usar `expect(...).toThrow(NomeDaClasseDeErro)` em vez de verificar mensagem de texto ou HttpException genérica
2. FOR ALL services migrados para domain errors, THE testes existentes SHALL ser atualizados para verificar a classe de erro específica correspondente

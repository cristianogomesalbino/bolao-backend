# Documento de Requisitos — Mappers/Presenters

## Introdução

Os controllers do projeto retornam objetos Prisma raw diretamente para a API, expondo campos internos do banco de dados e relações desnecessárias. Este módulo introduz Presenters com método estático `toHttp()` para transformar objetos Prisma em formato seguro e consistente para a API, garantindo que campos sensíveis nunca vazem e mantendo compatibilidade com os contratos existentes.

## Glossário

- **Presenter**: Classe com método estático `toHttp()` que transforma um objeto Prisma em formato seguro para resposta HTTP
- **toHttp**: Método estático do Presenter que recebe um objeto Prisma e retorna apenas os campos permitidos para a API
- **Controller**: Classe NestJS responsável por receber requisições HTTP e retornar respostas
- **Service**: Classe NestJS responsável pela lógica de negócio e acesso ao banco via Prisma
- **Objeto_Prisma**: Objeto retornado pelo Prisma ORM contendo todos os campos do modelo, incluindo campos sensíveis e relações

## Requisitos

### Requisito 1: Criar CampeonatoPresenter

**User Story:** Como desenvolvedor, quero um Presenter para Campeonato, para que a API retorne apenas os campos públicos da entidade sem expor detalhes internos do Prisma.

#### Critérios de Aceitação

1. THE CampeonatoPresenter SHALL expor um método estático `toHttp()` que receba um Objeto_Prisma de Campeonato e retorne um objeto contendo apenas os campos: id, nome, dataCriacao e atualizadoEm
2. WHEN o Controller de campeonatos criar um campeonato, THE Controller SHALL chamar `CampeonatoPresenter.toHttp()` para transformar o retorno antes de enviar a resposta
3. WHEN o Controller de campeonatos listar campeonatos, THE Controller SHALL chamar `CampeonatoPresenter.toHttp()` para cada item da lista antes de enviar a resposta

### Requisito 2: Criar TemporadaPresenter

**User Story:** Como desenvolvedor, quero um Presenter para Temporada, para que a API retorne a temporada com dados do campeonato relacionado em formato seguro.

#### Critérios de Aceitação

1. THE TemporadaPresenter SHALL expor um método estático `toHttp()` que receba um Objeto_Prisma de Temporada e retorne um objeto contendo os campos: id, ano, campeonatoId e dataCriacao
2. WHEN o Objeto_Prisma de Temporada incluir a relação campeonato, THE TemporadaPresenter SHALL incluir o campo campeonato transformado via `CampeonatoPresenter.toHttp()`
3. WHEN o Controller de temporadas criar ou listar temporadas, THE Controller SHALL chamar `TemporadaPresenter.toHttp()` para transformar o retorno antes de enviar a resposta

### Requisito 3: Criar GrupoPresenter

**User Story:** Como desenvolvedor, quero um Presenter para Grupo, para que a API retorne dados do grupo com relações aninhadas transformadas e sem expor campos internos.

#### Critérios de Aceitação

1. THE GrupoPresenter SHALL expor um método estático `toHttp()` que receba um Objeto_Prisma de Grupo e retorne um objeto contendo os campos: id, nome, temporadaId, privado, codigoConvite, permitirPalpiteAutomatico, maxParticipantes, ativo, dataCriacao e createdById
2. WHEN o Objeto_Prisma de Grupo incluir a relação temporada, THE GrupoPresenter SHALL incluir o campo temporada transformado via `TemporadaPresenter.toHttp()`
3. WHEN o Controller de grupos criar, listar, buscar por ID, atualizar ou alterar status de um grupo, THE Controller SHALL chamar `GrupoPresenter.toHttp()` para transformar o retorno antes de enviar a resposta

### Requisito 4: Criar GrupoUsuarioPresenter

**User Story:** Como desenvolvedor, quero um Presenter para GrupoUsuario, para que a API retorne dados de membros do grupo com relações de usuário e grupo transformadas de forma segura.

#### Critérios de Aceitação

1. THE GrupoUsuarioPresenter SHALL expor um método estático `toHttp()` que receba um Objeto_Prisma de GrupoUsuario e retorne um objeto contendo os campos: id, usuarioId, grupoId e role
2. WHEN o Objeto_Prisma de GrupoUsuario incluir a relação usuario, THE GrupoUsuarioPresenter SHALL incluir o campo usuario transformado via `UsuarioPresenter.toHttp()`
3. WHEN o Objeto_Prisma de GrupoUsuario incluir a relação grupo, THE GrupoUsuarioPresenter SHALL incluir o campo grupo transformado via `GrupoPresenter.toHttp()`
4. WHEN o Controller de grupo-usuario executar entrar por convite, adicionar membro ou listar membros, THE Controller SHALL chamar `GrupoUsuarioPresenter.toHttp()` para transformar o retorno antes de enviar a resposta

### Requisito 5: Migrar UsuarioResponseDto para UsuarioPresenter

**User Story:** Como desenvolvedor, quero migrar o UsuarioResponseDto existente para o padrão Presenter, para que todas as entidades sigam o mesmo padrão de transformação.

#### Critérios de Aceitação

1. THE UsuarioPresenter SHALL expor um método estático `toHttp()` que receba um Objeto_Prisma de Usuario e retorne um objeto contendo apenas os campos: id, nome, email, perfil, ativo, dataCriacao e atualizadoEm
2. THE UsuarioPresenter SHALL omitir o campo senha do retorno
3. WHEN o Controller de usuarios criar, buscar, atualizar ou listar usuarios, THE Controller SHALL chamar `UsuarioPresenter.toHttp()` para transformar o retorno antes de enviar a resposta
4. WHEN a migração estiver completa, THE UsuarioResponseDto existente em `src/modules/usuarios/dto/usuario-response.dto.ts` SHALL ser removido
5. WHEN a migração estiver completa, THE UsuarioResponseDto duplicado em `src/modules/grupos/dto/usuario-response.dto.ts` SHALL ser removido

### Requisito 6: Garantir que campos sensíveis não vazem na API

**User Story:** Como desenvolvedor, quero garantir que campos sensíveis como senha e tokens nunca sejam expostos nas respostas da API, para manter a segurança da aplicação.

#### Critérios de Aceitação

1. THE UsuarioPresenter SHALL omitir os campos senha, refreshTokens e quaisquer campos internos do Prisma que não façam parte do contrato público da API
2. FOR ALL Presenters, THE método `toHttp()` SHALL retornar apenas campos explicitamente listados, utilizando seleção positiva (allowlist) em vez de exclusão de campos
3. WHEN um Objeto_Prisma contiver relações aninhadas com dados de Usuario, THE Presenter responsável SHALL transformar o usuario via `UsuarioPresenter.toHttp()` antes de incluí-lo na resposta

### Requisito 7: Manter compatibilidade com contratos de API existentes

**User Story:** Como desenvolvedor, quero que a introdução dos Presenters mantenha os mesmos campos e formatos retornados pela API atual, para que clientes existentes continuem funcionando.

#### Critérios de Aceitação

1. THE CampeonatoPresenter SHALL retornar os mesmos campos que o `prisma.campeonato.create()` e `prisma.campeonato.findMany()` retornam atualmente: id, nome, dataCriacao e atualizadoEm
2. THE TemporadaPresenter SHALL retornar os mesmos campos que o `prisma.temporada.findMany({ include: { campeonato: true } })` retorna atualmente: id, ano, campeonatoId, dataCriacao e campeonato
3. THE GrupoPresenter SHALL retornar os mesmos campos que o `prisma.grupo.findMany({ include: { temporada: { include: { campeonato: true } } } })` retorna atualmente, incluindo as relações aninhadas
4. THE UsuarioPresenter SHALL retornar os mesmos campos que o `UsuarioResponseDto.fromEntity()` retorna atualmente: id, nome, email, perfil, ativo, dataCriacao e atualizadoEm

### Requisito 8: Presenters nos Controllers, não nos Services

**User Story:** Como desenvolvedor, quero que a transformação via Presenter aconteça exclusivamente nos controllers, para manter os services desacoplados da camada de apresentação.

#### Critérios de Aceitação

1. THE Services SHALL continuar retornando Objetos_Prisma sem transformação via Presenter
2. WHEN um Service de usuarios utilizar `UsuarioResponseDto.fromEntity()`, THE Service SHALL ser refatorado para retornar o Objeto_Prisma diretamente, movendo a transformação para o Controller via `UsuarioPresenter.toHttp()`
3. THE Controllers SHALL ser o único local onde `Presenter.toHttp()` é chamado para transformar respostas HTTP

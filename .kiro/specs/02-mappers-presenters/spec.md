# Feature: Adicionar Mappers e Presenters

## Problema

Os services retornam objetos Prisma raw diretamente para os controllers. Isso vaza detalhes do banco de dados (campos internos, relações desnecessárias) e acopla a camada de apresentação ao ORM.

Apenas `UsuarioResponseDto` existe como transformação de resposta.

## Objetivo

Criar Presenters para cada entidade, responsáveis por transformar o objeto do banco em um formato seguro e consistente para a API.

## Requisitos

### Requisito 1: Criar Presenters para cada entidade
- `src/modules/campeonatos/presenters/campeonato.presenter.ts`
- `src/modules/temporadas/presenters/temporada.presenter.ts`
- `src/modules/grupos/presenters/grupo.presenter.ts`
- `src/modules/grupo-usuario/presenters/grupo-usuario.presenter.ts`

### Requisito 2: Padrão do Presenter
Cada presenter deve ter um método estático `toHttp()` que recebe o objeto Prisma e retorna apenas os campos necessários para a API:
```typescript
export class CampeonatoPresenter {
  static toHttp(campeonato: Campeonato) {
    return {
      id: campeonato.id,
      nome: campeonato.nome,
      // ... apenas campos públicos
    };
  }
}
```

### Requisito 3: Integrar nos controllers
- Substituir retornos raw dos controllers por chamadas ao Presenter correspondente
- Manter compatibilidade com os contratos de API existentes (mesmos campos retornados)

### Requisito 4: Migrar UsuarioResponseDto para Presenter
- Converter `usuario-response.dto.ts` para o padrão Presenter
- Manter o DTO existente como deprecated ou remover se não houver uso direto

## Tarefas

- [ ] Auditar os retornos atuais de cada controller para mapear campos expostos
- [ ] Criar CampeonatoPresenter com método toHttp
- [ ] Criar TemporadaPresenter com método toHttp
- [ ] Criar GrupoPresenter com método toHttp
- [ ] Criar GrupoUsuarioPresenter com método toHttp
- [ ] Migrar UsuarioResponseDto para UsuarioPresenter
- [ ] Integrar presenters nos controllers de campeonatos
- [ ] Integrar presenters nos controllers de temporadas
- [ ] Integrar presenters nos controllers de grupos
- [ ] Integrar presenters nos controllers de grupo-usuario
- [ ] Integrar presenter nos controllers de usuarios
- [ ] Verificar que os contratos de API não quebraram (mesmos campos)

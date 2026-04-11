# Feature: Implementar Repository Pattern

## Problema

Os services acessam `PrismaService` diretamente, acoplando a lógica de negócio ao ORM. Isso dificulta testes (precisa mockar Prisma inteiro) e impede trocar a camada de persistência.

## Objetivo

Introduzir o Repository Pattern gradualmente, começando pelos módulos novos do roadmap (Jogos, Palpites) e refatorando os existentes de forma incremental.

## Requisitos

### Requisito 1: Criar interfaces de repositório
Para cada entidade, criar uma interface em `src/modules/{modulo}/repositories/`:
```typescript
export interface ICampeonatoRepository {
  criar(data: CreateCampeonatoDto): Promise<Campeonato>;
  listarTodos(): Promise<Campeonato[]>;
  buscarPorId(id: string): Promise<Campeonato | null>;
  atualizar(id: string, data: UpdateCampeonatoDto): Promise<Campeonato>;
  remover(id: string): Promise<void>;
}
```

### Requisito 2: Implementação Prisma
Criar `prisma-{entidade}.repository.ts` que implementa a interface usando PrismaService.

### Requisito 3: Implementação InMemory (para testes)
Criar `in-memory-{entidade}.repository.ts` que implementa a interface usando array em memória.

### Requisito 4: Injeção via token
Registrar repositórios nos módulos usando `provide/useFactory`:
```typescript
{
  provide: 'CampeonatoRepository',
  useFactory: (prisma: PrismaService) => new PrismaCampeonatoRepository(prisma),
  inject: [PrismaService],
}
```

### Requisito 5: Refatorar services
- Services recebem a interface do repositório via `@Inject('CampeonatoRepository')`
- Remover injeção direta de `PrismaService` nos services

### Requisito 6: Ordem de migração
1. Campeonatos (mais simples, sem dependências complexas)
2. Temporadas
3. Usuarios
4. Grupos
5. GrupoUsuario

## Tarefas

- [ ] Criar interface ICampeonatoRepository
- [ ] Criar PrismaCampeonatoRepository
- [ ] Criar InMemoryCampeonatoRepository
- [ ] Refatorar CampeonatosService para usar repositório
- [ ] Registrar repositório no CampeonatosModule
- [ ] Atualizar testes do CampeonatosService com InMemory ou mock do repositório
- [ ] Repetir para Temporadas
- [ ] Repetir para Usuarios
- [ ] Repetir para Grupos
- [ ] Repetir para GrupoUsuario
- [ ] Verificar que todos os testes passam
- [ ] Verificar que a API funciona corretamente

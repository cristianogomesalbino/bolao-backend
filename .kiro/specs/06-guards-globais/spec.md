# Feature: Guards Globais via APP_GUARD

## Problema

Os controllers usam `@UseGuards(JwtAuthGuard)` manualmente em cada rota protegida. Isso é propenso a erros: esquecer o decorator expõe a rota publicamente.

## Objetivo

Registrar `JwtAuthGuard` como guard global via `APP_GUARD` e usar um decorator `@Public()` para marcar as rotas que não precisam de autenticação. Rotas são protegidas por padrão.

## Requisitos

### Requisito 1: Criar decorator @Public()
- Criar `src/common/decorators/public.decorator.ts`
- Usar `SetMetadata('isPublic', true)`

### Requisito 2: Atualizar JwtAuthGuard
- Modificar `JwtAuthGuard` para verificar o metadata `isPublic`
- Se a rota for pública, permitir acesso sem token
```typescript
canActivate(context: ExecutionContext) {
  const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
    context.getHandler(),
    context.getClass(),
  ]);
  if (isPublic) return true;
  return super.canActivate(context);
}
```

### Requisito 3: Registrar como APP_GUARD
No `AppModule`, registrar o guard globalmente:
```typescript
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
],
```

### Requisito 4: Marcar rotas públicas
- Adicionar `@Public()` nas rotas que não precisam de autenticação:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /usuarios` (criação de conta, se aplicável)
  - Health check / root endpoint

### Requisito 5: Remover @UseGuards(JwtAuthGuard)
- Remover todos os `@UseGuards(JwtAuthGuard)` dos controllers
- Manter `@UseGuards(GroupRoleGuard)` e `@UseGuards(SelfOrAdminGuard)` onde necessário (esses são guards de autorização, não autenticação)

### Requisito 6: Testes
- Verificar que rotas protegidas retornam 401 sem token
- Verificar que rotas públicas funcionam sem token
- Verificar que guards de autorização continuam funcionando

## Tarefas

- [ ] Criar decorator @Public()
- [ ] Atualizar JwtAuthGuard para suportar @Public()
- [ ] Registrar JwtAuthGuard como APP_GUARD no AppModule
- [ ] Adicionar @Public() nas rotas de login e refresh
- [ ] Adicionar @Public() em outras rotas públicas
- [ ] Remover @UseGuards(JwtAuthGuard) de todos os controllers
- [ ] Testar rotas protegidas (401 sem token)
- [ ] Testar rotas públicas (200 sem token)
- [ ] Testar guards de autorização (GroupRoleGuard, SelfOrAdminGuard)

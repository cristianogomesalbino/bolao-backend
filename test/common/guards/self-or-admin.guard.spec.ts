import { describe, it, expect, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { SelfOrAdminGuard } from '@src/common/guards/self-or-admin.guard';

const createMockContext = (user: any, params: any = {}) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user, params }),
  }),
});

describe('SelfOrAdminGuard', () => {
  let guard: SelfOrAdminGuard;

  beforeEach(() => {
    guard = new SelfOrAdminGuard();
  });

  it('deve permitir SUPER_ADMIN acessar qualquer recurso', () => {
    const context = createMockContext(
      { id: 'user-1', perfil: 'SUPER_ADMIN' },
      { id: 'user-2' },
    );

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('deve permitir usuário acessar próprio recurso', () => {
    const context = createMockContext(
      { id: 'user-1', perfil: 'USER' },
      { id: 'user-1' },
    );

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('deve lançar ForbiddenException se USER tenta acessar recurso de outro', () => {
    const context = createMockContext(
      { id: 'user-1', perfil: 'USER' },
      { id: 'user-2' },
    );

    expect(() => guard.canActivate(context as any)).toThrow(
      ForbiddenException,
    );
  });

  it('deve lançar ForbiddenException se não há usuário autenticado', () => {
    const context = createMockContext(null, { id: 'user-1' });

    expect(() => guard.canActivate(context as any)).toThrow(
      ForbiddenException,
    );
  });
});

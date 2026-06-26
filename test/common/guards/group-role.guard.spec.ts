import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { GroupRoleGuard } from '@src/common/guards/group-role.guard';

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

const mockPrisma = {
  grupoUsuario: {
    findUnique: vi.fn(),
  },
};

const createMockContext = (user: any, params: any = {}) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user, params }),
  }),
  getHandler: () => ({}),
  getClass: () => ({}),
});

describe('GroupRoleGuard', () => {
  let guard: GroupRoleGuard;

  beforeEach(() => {
    guard = new GroupRoleGuard(mockReflector as any, mockPrisma as any);
    vi.clearAllMocks();
  });

  it('deve permitir acesso se não há roles requeridas', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);

    const context = createMockContext({ id: 'user-1' });
    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
  });

  it('deve lançar ForbiddenException se grupoId não está nos params', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);

    const context = createMockContext({ id: 'user-1' }, {});

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deve lançar ForbiddenException se usuário não pertence ao grupo', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    mockPrisma.grupoUsuario.findUnique.mockResolvedValue(null);

    const context = createMockContext({ id: 'user-1' }, { grupoId: 'grupo-1' });

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deve lançar ForbiddenException se role não é suficiente', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    mockPrisma.grupoUsuario.findUnique.mockResolvedValue({
      usuarioId: 'user-1',
      grupoId: 'grupo-1',
      role: 'MEMBER',
    });

    const context = createMockContext({ id: 'user-1' }, { grupoId: 'grupo-1' });

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deve permitir acesso se role é ADMIN', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    mockPrisma.grupoUsuario.findUnique.mockResolvedValue({
      usuarioId: 'user-1',
      grupoId: 'grupo-1',
      role: 'ADMIN',
    });

    const context = createMockContext({ id: 'user-1' }, { grupoId: 'grupo-1' });

    const result = await guard.canActivate(context as any);
    expect(result).toBe(true);
  });

  it('deve permitir MEMBER quando roles incluem MEMBER', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['ADMIN', 'MEMBER']);
    mockPrisma.grupoUsuario.findUnique.mockResolvedValue({
      usuarioId: 'user-1',
      grupoId: 'grupo-1',
      role: 'MEMBER',
    });

    const context = createMockContext({ id: 'user-1' }, { grupoId: 'grupo-1' });

    const result = await guard.canActivate(context as any);
    expect(result).toBe(true);
  });
});

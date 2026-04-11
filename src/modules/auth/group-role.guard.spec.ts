import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GroupRoleGuard } from './group-role.guard';
import { PrismaService } from '../../prisma/prisma.service';

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockPrisma = {
  grupoUsuario: {
    findUnique: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupRoleGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<GroupRoleGuard>(GroupRoleGuard);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
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

    const context = createMockContext(
      { id: 'user-1' },
      { grupoId: 'grupo-1' },
    );

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

    const context = createMockContext(
      { id: 'user-1' },
      { grupoId: 'grupo-1' },
    );

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

    const context = createMockContext(
      { id: 'user-1' },
      { grupoId: 'grupo-1' },
    );

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

    const context = createMockContext(
      { id: 'user-1' },
      { grupoId: 'grupo-1' },
    );

    const result = await guard.canActivate(context as any);
    expect(result).toBe(true);
  });
});

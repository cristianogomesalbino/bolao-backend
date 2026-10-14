import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaService } from '@src/prisma/prisma.service';
import { PrismaRefreshTokenRepository } from '@src/modules/auth/repositories/prisma-refresh-token.repository';

type Transacao = {
  refreshToken: {
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

function criarPrisma() {
  const tx: Transacao = {
    refreshToken: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  const prisma = {
    refreshToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(
      async (
        arg: ((cliente: Transacao) => Promise<unknown>) | Promise<unknown>[],
      ) => {
        if (typeof arg === 'function') {
          return arg(tx);
        }
        return Promise.all(arg);
      },
    ),
  };

  return { prisma, tx };
}

describe('PrismaRefreshTokenRepository', () => {
  let repo: PrismaRefreshTokenRepository;
  let prisma: ReturnType<typeof criarPrisma>['prisma'];
  let tx: ReturnType<typeof criarPrisma>['tx'];

  beforeEach(() => {
    const criado = criarPrisma();
    prisma = criado.prisma;
    tx = criado.tx;
    repo = new PrismaRefreshTokenRepository(prisma as unknown as PrismaService);
  });

  it('grava o sucessor e marca o token antigo na mesma transação', async () => {
    tx.refreshToken.findUnique.mockResolvedValue({
      id: 'id-1',
      substituidoPor: null,
      substituidoEm: null,
    });
    tx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    const expiraEm = new Date('2026-11-12T00:00:00.000Z');
    const emitirNovo = vi.fn(() => ({
      token: 'novo',
      usuarioId: 'user-1',
      expiraEm,
    }));

    const resultado = await repo.rotacionar('antigo', 60_000, emitirNovo);

    expect(resultado).toEqual({ status: 'rotacionado', refreshToken: 'novo' });
    const atualizacao = tx.refreshToken.updateMany.mock.calls[0] as [
      {
        where: { id: string; substituidoPor: null };
        data: { substituidoPor: string; substituidoEm: Date };
      },
    ];
    expect(atualizacao[0].where).toEqual({
      id: 'id-1',
      substituidoPor: null,
    });
    expect(atualizacao[0].data.substituidoPor).toBe('novo');
    expect(atualizacao[0].data.substituidoEm).toBeInstanceOf(Date);
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: { token: 'novo', usuarioId: 'user-1', expiraEm },
    });
    expect(emitirNovo).toHaveBeenCalledOnce();
  });

  it('devolve o mesmo sucessor quando o token já foi trocado dentro da janela', async () => {
    tx.refreshToken.findUnique
      .mockResolvedValueOnce({
        id: 'id-1',
        substituidoPor: 'ja-emitido',
        substituidoEm: new Date(),
      })
      .mockResolvedValueOnce({ token: 'ja-emitido' });

    const emitirNovo = vi.fn();
    const resultado = await repo.rotacionar('antigo', 60_000, emitirNovo);

    expect(resultado).toEqual({
      status: 'reusado',
      refreshToken: 'ja-emitido',
    });
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
    expect(emitirNovo).not.toHaveBeenCalled();
  });

  it('reutiliza o sucessor quando outra requisição reservou o token', async () => {
    const expiraEm = new Date();
    tx.refreshToken.findUnique
      .mockResolvedValueOnce({
        id: 'id-1',
        substituidoPor: null,
        substituidoEm: null,
      })
      .mockResolvedValueOnce({
        id: 'id-1',
        substituidoPor: 'ja-emitido',
        substituidoEm: new Date(),
      })
      .mockResolvedValueOnce({ token: 'ja-emitido' });
    tx.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    const resultado = await repo.rotacionar('antigo', 60_000, () => ({
      token: 'descartado',
      usuarioId: 'user-1',
      expiraEm,
    }));

    expect(resultado).toEqual({
      status: 'reusado',
      refreshToken: 'ja-emitido',
    });
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it('recusa reuso depois da janela ou quando o sucessor não existe', async () => {
    tx.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'id-1',
      substituidoPor: 'ja-emitido',
      substituidoEm: new Date(Date.now() - 120_000),
    });

    await expect(
      repo.rotacionar('antigo', 60_000, vi.fn()),
    ).resolves.toBeNull();

    tx.refreshToken.findUnique
      .mockResolvedValueOnce({
        id: 'id-1',
        substituidoPor: 'ja-emitido',
        substituidoEm: new Date(),
      })
      .mockResolvedValueOnce(null);

    await expect(
      repo.rotacionar('antigo', 60_000, vi.fn()),
    ).resolves.toBeNull();
  });

  it('retorna nulo quando o token não existe', async () => {
    tx.refreshToken.findUnique.mockResolvedValue(null);

    await expect(
      repo.rotacionar('ausente', 60_000, vi.fn()),
    ).resolves.toBeNull();
  });

  it('no logout remove o token atual e o antecessor da janela', async () => {
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await repo.removerPorToken('atual');

    expect(prisma.$transaction).toHaveBeenCalledWith([
      expect.any(Promise),
      expect.any(Promise),
    ]);
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { substituidoPor: 'atual' },
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'atual' },
    });
  });
});

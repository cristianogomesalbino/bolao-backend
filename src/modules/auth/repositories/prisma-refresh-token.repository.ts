import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NovoRefreshToken,
  RefreshTokenRepository,
  ResultadoRotacao,
} from './refresh-token.repository.interface';

type TransacaoRefresh = Prisma.TransactionClient;

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: NovoRefreshToken) {
    return this.prisma.refreshToken.create({ data });
  }

  buscarPorToken(token: string) {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async removerPorUsuarioId(usuarioId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { usuarioId } });
  }

  async removerPorToken(token: string) {
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { substituidoPor: token } }),
      this.prisma.refreshToken.deleteMany({ where: { token } }),
    ]);
  }

  async rotacionar(
    tokenAntigo: string,
    graciaMs: number,
    emitirNovo: () => NovoRefreshToken,
  ): Promise<ResultadoRotacao | null> {
    return this.prisma.$transaction(async (tx) => {
      const registro = await tx.refreshToken.findUnique({
        where: { token: tokenAntigo },
      });

      if (!registro) {
        return null;
      }

      if (registro.substituidoPor) {
        return this.reutilizar(
          tx,
          registro.substituidoPor,
          registro.substituidoEm,
          graciaMs,
        );
      }

      return this.gravarSucessor(tx, registro.id, emitirNovo(), graciaMs);
    });
  }

  private async gravarSucessor(
    tx: TransacaoRefresh,
    id: string,
    novo: NovoRefreshToken,
    graciaMs: number,
  ): Promise<ResultadoRotacao | null> {
    const reserva = await tx.refreshToken.updateMany({
      where: { id, substituidoPor: null },
      data: { substituidoPor: novo.token, substituidoEm: new Date() },
    });

    if (reserva.count === 1) {
      await tx.refreshToken.create({ data: novo });
      return { status: 'rotacionado', refreshToken: novo.token };
    }

    const atual = await tx.refreshToken.findUnique({ where: { id } });

    if (!atual?.substituidoPor) {
      return null;
    }

    return this.reutilizar(
      tx,
      atual.substituidoPor,
      atual.substituidoEm,
      graciaMs,
    );
  }

  private async reutilizar(
    tx: TransacaoRefresh,
    substituidoPor: string,
    substituidoEm: Date | null,
    graciaMs: number,
  ): Promise<ResultadoRotacao | null> {
    const momento = substituidoEm ? new Date(substituidoEm).getTime() : 0;
    const dentroDaGraca = Date.now() - momento <= graciaMs;

    if (!dentroDaGraca) {
      return null;
    }

    const sucessor = await tx.refreshToken.findUnique({
      where: { token: substituidoPor },
    });

    if (!sucessor) {
      return null;
    }

    return { status: 'reusado', refreshToken: sucessor.token };
  }
}

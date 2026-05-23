import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RefreshTokenRepository } from './refresh-token.repository.interface';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: { token: string; usuarioId: string; expiraEm: Date }) {
    return this.prisma.refreshToken.create({ data });
  }

  buscarPorToken(token: string) {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async removerPorUsuarioId(usuarioId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { usuarioId } });
  }

  async removerPorToken(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
  }
}

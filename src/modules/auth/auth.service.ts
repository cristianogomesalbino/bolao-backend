import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorFactory } from '../../common/errors/error.factory';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario || !usuario.ativo) {
      throw ErrorFactory.unauthorized('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw ErrorFactory.unauthorized('Credenciais inválidas');
    }

    await this.prisma.refreshToken.deleteMany({
      where: { usuarioId: usuario.id },
    });

    const payload = { sub: usuario.id, email: usuario.email, perfil: usuario.perfil };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: usuario.id,
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw ErrorFactory.unauthorized('Refresh token não fornecido');
    }

    const tokenRegistro = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRegistro) {
      throw ErrorFactory.unauthorized('Refresh token inválido');
    }

    try {
      this.jwtService.verify(tokenRegistro.token);
    } catch {
      throw ErrorFactory.unauthorized('Refresh token expirado');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: tokenRegistro.usuarioId },
    });

    if (!usuario) {
      throw ErrorFactory.notFound('Usuário não encontrado');
    }

    const payload = { sub: usuario.id, email: usuario.email, perfil: usuario.perfil };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    return { accessToken };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw ErrorFactory.unauthorized('Refresh token não fornecido');
    }

    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { mensagem: 'Logout realizado com sucesso' };
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CredenciaisInvalidasError,
  RefreshNaoFornecidoError,
  RefreshInvalidoError,
  RefreshExpiradoError,
} from '../../common/errors/domain-errors';
import { UsuarioNaoEncontradoError } from '../../common/errors/domain-errors/usuarios.errors';
import { AUTH } from './auth.constants';

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
      throw new CredenciaisInvalidasError();
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new CredenciaisInvalidasError();
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
        expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new RefreshNaoFornecidoError();
    }

    const tokenRegistro = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRegistro) {
      throw new RefreshInvalidoError();
    }

    try {
      this.jwtService.verify(tokenRegistro.token);
    } catch {
      throw new RefreshExpiradoError();
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: tokenRegistro.usuarioId },
    });

    if (!usuario) {
      throw new UsuarioNaoEncontradoError();
    }

    const payload = { sub: usuario.id, email: usuario.email, perfil: usuario.perfil };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    return { accessToken };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new RefreshNaoFornecidoError();
    }

    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { mensagem: AUTH.MENSAGENS.LOGOUT_SUCESSO };
  }
}

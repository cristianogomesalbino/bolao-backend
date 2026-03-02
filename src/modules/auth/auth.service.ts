import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senha,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('Senha inválida');
    }

    const payload = {
      id: usuario.id,
      perfil: usuario.perfil,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      { id: usuario.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: usuario.id,
        expiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não enviado');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh inválido');
    }

    try {
      this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh expirado ou inválido');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: stored.usuarioId },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const newAccessToken = this.jwtService.sign(
      {
        id: usuario.id,
        perfil: usuario.perfil,
      },
      { expiresIn: '15m' },
    );

    return { accessToken: newAccessToken };
  }
  
  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não enviado');
    }

    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { message: 'Logout realizado com sucesso' };
  }
}

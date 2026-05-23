import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GroupRoleGuard } from '../../common/guards/group-role.guard';
import { SelfOrAdminGuard } from '../../common/guards/self-or-admin.guard';
import { ResendEmailService } from './email/resend-email.service';
import { PrismaRefreshTokenRepository } from './repositories/prisma-refresh-token.repository';
import { PrismaRecuperacaoSenhaRepository } from './repositories/prisma-recuperacao-senha.repository';
import { AUTH } from './auth.constants';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    UsuariosModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: AUTH.TOKEN.ACCESS_EXPIRATION },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GroupRoleGuard,
    SelfOrAdminGuard,
    { provide: AUTH.EMAIL_SERVICE_TOKEN, useClass: ResendEmailService },
    { provide: AUTH.REFRESH_TOKEN_REPOSITORY_TOKEN, useClass: PrismaRefreshTokenRepository },
    { provide: AUTH.RECUPERACAO_SENHA_REPOSITORY_TOKEN, useClass: PrismaRecuperacaoSenhaRepository },
  ],
})
export class AuthModule {}

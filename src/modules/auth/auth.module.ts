import { Module } from '@nestjs/common';
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
    UsuariosModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: AUTH.TOKEN.ACCESS_EXPIRATION },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GroupRoleGuard,
    SelfOrAdminGuard,
    { provide: AUTH.EMAIL_SERVICE_TOKEN, useClass: ResendEmailService },
    {
      provide: AUTH.REFRESH_TOKEN_REPOSITORY_TOKEN,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: AUTH.RECUPERACAO_SENHA_REPOSITORY_TOKEN,
      useClass: PrismaRecuperacaoSenhaRepository,
    },
  ],
})
export class AuthModule {}

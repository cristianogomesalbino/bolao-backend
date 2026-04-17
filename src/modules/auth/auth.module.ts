import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { GroupRoleGuard } from '../../common/guards/group-role.guard';
import { SelfOrAdminGuard } from '../../common/guards/self-or-admin.guard';
import { ResendEmailService } from './email/resend-email.service';
import { AUTH } from './auth.constants';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GroupRoleGuard,
    SelfOrAdminGuard,
    { provide: AUTH.EMAIL_SERVICE_TOKEN, useClass: ResendEmailService },
  ],
})
export class AuthModule {}

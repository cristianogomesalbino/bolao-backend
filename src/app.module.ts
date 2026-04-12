import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { TemporadasModule } from './modules/temporadas/temporadas.module';
import { PrismaModule } from './prisma/prisma.module';
import { CampeonatosModule } from './modules/campeonatos/campeonatos.module';
import { GruposModule } from './modules/grupos/grupos.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { GrupoUsuarioModule } from './modules/grupo-usuario/grupo-usuario.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';

@Module({
  imports: [
    TemporadasModule,
    PrismaModule,
    CampeonatosModule,
    GrupoUsuarioModule,
    GruposModule,
    AuthModule,
    UsuariosModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

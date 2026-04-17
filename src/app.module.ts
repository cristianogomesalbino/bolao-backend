import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { CampeonatosModule } from './modules/campeonatos/campeonatos.module';
import { GrupoUsuarioModule } from './modules/grupo-usuario/grupo-usuario.module';
import { GruposModule } from './modules/grupos/grupos.module';
import { JogosModule } from './modules/jogos/jogos.module';
import { PalpitesModule } from './modules/palpites/palpites.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { TemporadasModule } from './modules/temporadas/temporadas.module';
import { TimesModule } from './modules/times/times.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CampeonatosModule,
    GrupoUsuarioModule,
    GruposModule,
    JogosModule,
    PalpitesModule,
    RankingModule,
    TemporadasModule,
    TimesModule,
    UsuariosModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

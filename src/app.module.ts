import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TemporadasModule } from './modules/temporadas/temporadas.module';
import { PrismaModule } from './prisma/prisma.module';
import { CampeonatosModule } from './modules/campeonatos/campeonatos.module';
import { GruposModule } from './modules/grupos/grupos.module';

@Module({
  imports: [TemporadasModule, PrismaModule, CampeonatosModule, GruposModule],
  controllers: [AppController],
})
export class AppModule {}

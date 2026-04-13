import { Module } from '@nestjs/common';
import { TemporadasService } from './temporadas.service';
import { TemporadasController } from './temporadas.controller';
import { TEMPORADAS } from './temporadas.constants';
import { PrismaTemporadaRepository } from './repositories/prisma-temporada.repository';
import { CampeonatosModule } from '../campeonatos/campeonatos.module';

@Module({
  imports: [CampeonatosModule],
  controllers: [TemporadasController],
  providers: [
    TemporadasService,
    {
      provide: TEMPORADAS.REPOSITORY_TOKEN,
      useClass: PrismaTemporadaRepository,
    },
  ],
  exports: [TEMPORADAS.REPOSITORY_TOKEN],
})
export class TemporadasModule {}

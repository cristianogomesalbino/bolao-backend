import { Module, forwardRef } from '@nestjs/common';
import { TemporadasService } from './temporadas.service';
import { TemporadasController } from './temporadas.controller';
import { TEMPORADAS } from './temporadas.constants';
import { PrismaTemporadaRepository } from './repositories/prisma-temporada.repository';
import { CampeonatosModule } from '../campeonatos/campeonatos.module';
import { JogosModule } from '../jogos/jogos.module';

@Module({
  imports: [CampeonatosModule, forwardRef(() => JogosModule)],
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

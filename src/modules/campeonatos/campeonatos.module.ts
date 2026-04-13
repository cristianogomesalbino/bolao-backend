import { Module } from '@nestjs/common';
import { CampeonatosService } from './campeonatos.service';
import { CampeonatosController } from './campeonatos.controller';
import { CAMPEONATOS } from './campeonatos.constants';
import { PrismaCampeonatoRepository } from './repositories/prisma-campeonato.repository';

@Module({
  controllers: [CampeonatosController],
  providers: [
    CampeonatosService,
    { provide: CAMPEONATOS.REPOSITORY_TOKEN, useClass: PrismaCampeonatoRepository },
  ],
  exports: [CAMPEONATOS.REPOSITORY_TOKEN],
})
export class CampeonatosModule {}

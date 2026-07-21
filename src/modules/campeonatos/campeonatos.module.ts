import { Module } from '@nestjs/common';
import { CampeonatosService } from './campeonatos.service';
import { CampeonatosController } from './campeonatos.controller';
import { CAMPEONATOS } from './campeonatos.constants';
import { PrismaCampeonatoRepository } from './repositories/prisma-campeonato.repository';
import { CampeonatoStatusService } from './services/campeonato-status.service';
import { JOGOS } from '../jogos/jogos.constants';
import { PrismaFaseRepository } from '../jogos/repositories/prisma-fase.repository';
import { PrismaJogoRepository } from '../jogos/repositories/prisma-jogo.repository';

@Module({
  controllers: [CampeonatosController],
  providers: [
    CampeonatosService,
    CampeonatoStatusService,
    {
      provide: CAMPEONATOS.REPOSITORY_TOKEN,
      useClass: PrismaCampeonatoRepository,
    },
    {
      provide: CAMPEONATOS.STATUS_SERVICE_TOKEN,
      useExisting: CampeonatoStatusService,
    },
    { provide: JOGOS.FASE_REPOSITORY_TOKEN, useClass: PrismaFaseRepository },
    { provide: JOGOS.JOGO_REPOSITORY_TOKEN, useClass: PrismaJogoRepository },
  ],
  exports: [CAMPEONATOS.REPOSITORY_TOKEN, CAMPEONATOS.STATUS_SERVICE_TOKEN],
})
export class CampeonatosModule {}

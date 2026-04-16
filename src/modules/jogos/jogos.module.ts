import { Module } from '@nestjs/common';
import { FaseController } from './controllers/fase.controller';
import { JogoController } from './controllers/jogo.controller';
import { FaseService } from './services/fase.service';
import { JogoService } from './services/jogo.service';
import { ApiFootballService } from './services/api-football.service';
import { JOGOS } from './jogos.constants';
import { PrismaFaseRepository } from './repositories/prisma-fase.repository';
import { PrismaJogoRepository } from './repositories/prisma-jogo.repository';
import { TemporadasModule } from '../temporadas/temporadas.module';

@Module({
  imports: [TemporadasModule],
  controllers: [FaseController, JogoController],
  providers: [
    FaseService,
    JogoService,
    ApiFootballService,
    {
      provide: JOGOS.FASE_REPOSITORY_TOKEN,
      useClass: PrismaFaseRepository,
    },
    {
      provide: JOGOS.JOGO_REPOSITORY_TOKEN,
      useClass: PrismaJogoRepository,
    },
  ],
  exports: [JOGOS.FASE_REPOSITORY_TOKEN, JOGOS.JOGO_REPOSITORY_TOKEN],
})
export class JogosModule {}

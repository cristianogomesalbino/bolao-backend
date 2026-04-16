import { Module } from '@nestjs/common';
import { FaseController } from './controllers/fase.controller';
import { JogoController } from './controllers/jogo.controller';
import { FaseService } from './services/fase.service';
import { JogoService } from './services/jogo.service';
import { FutebolApiService } from './services/futebol-api.service';
import { JOGOS } from './jogos.constants';
import { PrismaFaseRepository } from './repositories/prisma-fase.repository';
import { PrismaJogoRepository } from './repositories/prisma-jogo.repository';
import { TemporadasModule } from '../temporadas/temporadas.module';
import { TimesModule } from '../times/times.module';

@Module({
  imports: [TemporadasModule, TimesModule],
  controllers: [FaseController, JogoController],
  providers: [
    FaseService,
    JogoService,
    FutebolApiService,
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

import { Module, forwardRef } from '@nestjs/common';
import { FaseController } from './controllers/fase.controller';
import { JogoController } from './controllers/jogo.controller';
import { SincronizacaoController } from './controllers/sincronizacao.controller';
import { FaseService } from './services/fase.service';
import { JogoService } from './services/jogo.service';
import { FutebolApiService } from './services/futebol-api.service';
import { SincronizacaoAutomaticaService } from './services/sincronizacao-automatica.service';
import { JOGOS } from './jogos.constants';
import { PrismaFaseRepository } from './repositories/prisma-fase.repository';
import { PrismaJogoRepository } from './repositories/prisma-jogo.repository';
import { PrismaLogSincronizacaoRepository } from './repositories/prisma-log-sincronizacao.repository';
import { TemporadasModule } from '../temporadas/temporadas.module';
import { TimesModule } from '../times/times.module';

@Module({
  imports: [forwardRef(() => TemporadasModule), TimesModule],
  controllers: [FaseController, JogoController, SincronizacaoController],
  providers: [
    FaseService,
    JogoService,
    FutebolApiService,
    SincronizacaoAutomaticaService,
    {
      provide: JOGOS.FASE_REPOSITORY_TOKEN,
      useClass: PrismaFaseRepository,
    },
    {
      provide: JOGOS.JOGO_REPOSITORY_TOKEN,
      useClass: PrismaJogoRepository,
    },
    {
      provide: JOGOS.LOG_SINCRONIZACAO_REPOSITORY_TOKEN,
      useClass: PrismaLogSincronizacaoRepository,
    },
  ],
  exports: [JOGOS.FASE_REPOSITORY_TOKEN, JOGOS.JOGO_REPOSITORY_TOKEN],
})
export class JogosModule {}

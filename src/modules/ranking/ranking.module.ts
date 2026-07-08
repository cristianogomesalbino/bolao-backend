import { Module } from '@nestjs/common';
import { PontuacaoService } from './services/pontuacao.service';
import { RankingService } from './services/ranking.service';
import { RankingController } from './controllers/ranking.controller';
import { PalpitesModule } from '../palpites/palpites.module';
import { JogosModule } from '../jogos/jogos.module';
import { GruposModule } from '../grupos/grupos.module';
import { GrupoUsuarioModule } from '../grupo-usuario/grupo-usuario.module';

@Module({
  imports: [PalpitesModule, JogosModule, GruposModule, GrupoUsuarioModule],
  controllers: [RankingController],
  providers: [PontuacaoService, RankingService],
  exports: [RankingService, PontuacaoService],
})
export class RankingModule {}

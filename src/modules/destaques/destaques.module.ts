import { Module, forwardRef } from '@nestjs/common';
import { DESTAQUES } from './destaques.constants';
import { DestaqueController } from './controllers/destaque.controller';
import { DestaqueEventService } from './services/destaque-event.service';
import { DestaqueGeneratorService } from './services/destaque-generator.service';
import { DestaqueSequenciaService } from './services/destaque-sequencia.service';
import { DestaqueReactionService } from './services/destaque-reaction.service';
import { DestaqueNotificacaoService } from './services/destaque-notificacao.service';
import { DestaqueCronService } from './services/destaque-cron.service';
import { DestaqueListagemService } from './services/destaque-listagem.service';
import { DestaquePorMembroService } from './services/destaque-por-membro.service';
import { DestaqueAcertoService } from './services/destaque-acerto.service';
import { DestaqueRecordeService } from './services/destaque-recorde.service';
import { PrismaDestaqueRepository } from './repositories/prisma-destaque.repository';
import { PrismaRecordeRepository } from './repositories/prisma-recorde.repository';
import { PrismaRankingSnapshotRepository } from './repositories/prisma-ranking-snapshot.repository';
import { JogosModule } from '../jogos/jogos.module';
import { PalpitesModule } from '../palpites/palpites.module';
import { GruposModule } from '../grupos/grupos.module';
import { GrupoUsuarioModule } from '../grupo-usuario/grupo-usuario.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [
    forwardRef(() => JogosModule),
    forwardRef(() => PalpitesModule),
    forwardRef(() => GruposModule),
    forwardRef(() => GrupoUsuarioModule),
    forwardRef(() => NotificacoesModule),
    forwardRef(() => UsuariosModule),
    forwardRef(() => RankingModule),
  ],
  controllers: [DestaqueController],
  providers: [
    DestaqueEventService,
    DestaqueGeneratorService,
    DestaquePorMembroService,
    DestaqueAcertoService,
    DestaqueSequenciaService,
    DestaqueRecordeService,
    DestaqueReactionService,
    DestaqueNotificacaoService,
    DestaqueCronService,
    DestaqueListagemService,
    {
      provide: DESTAQUES.DESTAQUE_REPOSITORY_TOKEN,
      useClass: PrismaDestaqueRepository,
    },
    {
      provide: DESTAQUES.RECORDE_REPOSITORY_TOKEN,
      useClass: PrismaRecordeRepository,
    },
    {
      provide: DESTAQUES.RANKING_SNAPSHOT_REPOSITORY_TOKEN,
      useClass: PrismaRankingSnapshotRepository,
    },
    {
      provide: DESTAQUES.EVENT_SERVICE_TOKEN,
      useExisting: DestaqueEventService,
    },
  ],
  exports: [DestaqueEventService, DESTAQUES.EVENT_SERVICE_TOKEN],
})
export class DestaquesModule {}

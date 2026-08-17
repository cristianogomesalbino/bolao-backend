import { Module, forwardRef } from '@nestjs/common';
import { DESTAQUES } from './destaques.constants';
import { DestaqueController } from './controllers/destaque.controller';
import { DestaqueEventService } from './services/destaque-event.service';
import { DestaqueGeneratorService } from './services/destaque-generator.service';
import { DestaqueSequenciaService } from './services/destaque-sequencia.service';
import { DestaqueReactionService } from './services/destaque-reaction.service';
import { DestaqueNotificacaoService } from './services/destaque-notificacao.service';
import { DestaqueCronService } from './services/destaque-cron.service';
import { PontuacaoService } from '../ranking/services/pontuacao.service';
import { PrismaDestaqueRepository } from './repositories/prisma-destaque.repository';
import { PrismaRecordeRepository } from './repositories/prisma-recorde.repository';
import { PrismaRankingSnapshotRepository } from './repositories/prisma-ranking-snapshot.repository';
import { JogosModule } from '../jogos/jogos.module';
import { PalpitesModule } from '../palpites/palpites.module';
import { GruposModule } from '../grupos/grupos.module';
import { GrupoUsuarioModule } from '../grupo-usuario/grupo-usuario.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [
    forwardRef(() => JogosModule),
    forwardRef(() => PalpitesModule),
    forwardRef(() => GruposModule),
    forwardRef(() => GrupoUsuarioModule),
    forwardRef(() => NotificacoesModule),
  ],
  controllers: [DestaqueController],
  providers: [
    // Services do módulo
    DestaqueEventService,
    DestaqueGeneratorService,
    DestaqueSequenciaService,
    DestaqueReactionService,
    DestaqueNotificacaoService,
    DestaqueCronService,
    // Services de outros módulos (sem dependências — instanciação direta)
    PontuacaoService,
    // Repositories próprios (Prisma)
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
    // Token de exportação
    {
      provide: DESTAQUES.EVENT_SERVICE_TOKEN,
      useExisting: DestaqueEventService,
    },
  ],
  exports: [DestaqueEventService, DESTAQUES.EVENT_SERVICE_TOKEN],
})
export class DestaquesModule {}

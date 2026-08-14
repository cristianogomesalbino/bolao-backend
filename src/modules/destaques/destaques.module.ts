import { Module } from '@nestjs/common';
import { DESTAQUES } from './destaques.constants';
import { JOGOS } from '../jogos/jogos.constants';
import { PALPITES } from '../palpites/palpites.constants';
import { GRUPOS } from '../grupos/grupos.constants';
import { GRUPO_USUARIO } from '../grupo-usuario/grupo-usuario.constants';
import { NOTIFICACOES } from '../notificacoes/notificacoes.constants';
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
import { PrismaJogoRepository } from '../jogos/repositories/prisma-jogo.repository';
import { PrismaFaseRepository } from '../jogos/repositories/prisma-fase.repository';
import { PrismaPalpiteRepository } from '../palpites/repositories/prisma-palpite.repository';
import { PrismaPalpiteDobradoRepository } from '../palpites/repositories/prisma-palpite-dobrado.repository';
import { PrismaGrupoRepository } from '../grupos/repositories/prisma-grupo.repository';
import { PrismaGrupoUsuarioRepository } from '../grupo-usuario/repositories/prisma-grupo-usuario.repository';
import { PrismaNotificacaoRepository } from '../notificacoes/repositories/prisma-notificacao.repository';

@Module({
  controllers: [DestaqueController],
  providers: [
    // Services do módulo
    DestaqueEventService,
    DestaqueGeneratorService,
    DestaqueSequenciaService,
    DestaqueReactionService,
    DestaqueNotificacaoService,
    DestaqueCronService,
    // Services de outros módulos (instanciados localmente)
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
    // Repositories de outros módulos
    { provide: JOGOS.JOGO_REPOSITORY_TOKEN, useClass: PrismaJogoRepository },
    { provide: JOGOS.FASE_REPOSITORY_TOKEN, useClass: PrismaFaseRepository },
    {
      provide: PALPITES.PALPITE_REPOSITORY_TOKEN,
      useClass: PrismaPalpiteRepository,
    },
    {
      provide: PALPITES.PALPITE_DOBRADO_REPOSITORY_TOKEN,
      useClass: PrismaPalpiteDobradoRepository,
    },
    { provide: GRUPOS.REPOSITORY_TOKEN, useClass: PrismaGrupoRepository },
    {
      provide: GRUPO_USUARIO.REPOSITORY_TOKEN,
      useClass: PrismaGrupoUsuarioRepository,
    },
    {
      provide: NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN,
      useClass: PrismaNotificacaoRepository,
    },
  ],
  exports: [DestaqueEventService, DESTAQUES.EVENT_SERVICE_TOKEN],
})
export class DestaquesModule {}

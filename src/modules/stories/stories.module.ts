import { Module } from '@nestjs/common';
import { STORIES } from './stories.constants';
import { JOGOS } from '../jogos/jogos.constants';
import { PALPITES } from '../palpites/palpites.constants';
import { GRUPOS } from '../grupos/grupos.constants';
import { GRUPO_USUARIO } from '../grupo-usuario/grupo-usuario.constants';
import { NOTIFICACOES } from '../notificacoes/notificacoes.constants';
import { StoryController } from './controllers/story.controller';
import { StoryEventService } from './services/story-event.service';
import { StoryGeneratorService } from './services/story-generator.service';
import { StorySequenciaService } from './services/story-sequencia.service';
import { StoryReactionService } from './services/story-reaction.service';
import { StoryNotificacaoService } from './services/story-notificacao.service';
import { StoryCronService } from './services/story-cron.service';
import { PontuacaoService } from '../ranking/services/pontuacao.service';
import { PrismaStoryRepository } from './repositories/prisma-story.repository';
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
  controllers: [StoryController],
  providers: [
    // Services do módulo
    StoryEventService,
    StoryGeneratorService,
    StorySequenciaService,
    StoryReactionService,
    StoryNotificacaoService,
    StoryCronService,
    // Services de outros módulos (instanciados localmente)
    PontuacaoService,
    // Repositories próprios (Prisma)
    {
      provide: STORIES.STORY_REPOSITORY_TOKEN,
      useClass: PrismaStoryRepository,
    },
    {
      provide: STORIES.RECORDE_REPOSITORY_TOKEN,
      useClass: PrismaRecordeRepository,
    },
    {
      provide: STORIES.RANKING_SNAPSHOT_REPOSITORY_TOKEN,
      useClass: PrismaRankingSnapshotRepository,
    },
    // Token de exportação
    {
      provide: STORIES.EVENT_SERVICE_TOKEN,
      useExisting: StoryEventService,
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
  exports: [StoryEventService, STORIES.EVENT_SERVICE_TOKEN],
})
export class StoriesModule {}

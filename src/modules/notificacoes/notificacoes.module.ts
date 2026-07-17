import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NOTIFICACOES } from './notificacoes.constants';
import { JOGOS } from '../jogos/jogos.constants';
import { PALPITES } from '../palpites/palpites.constants';
import { GRUPO_USUARIO } from '../grupo-usuario/grupo-usuario.constants';
import { GRUPOS } from '../grupos/grupos.constants';
import { NotificacaoController } from './controllers/notificacao.controller';
import { PushController } from './controllers/push.controller';
import { PreferenciaController } from './controllers/preferencia.controller';
import { NotificacaoService } from './services/notificacao.service';
import { NotificacaoEventService } from './services/notificacao-event.service';
import { NotificacaoAcertoService } from './services/notificacao-acerto.service';
import { NotificacaoRodadaService } from './services/notificacao-rodada.service';
import { NotificacaoRankingService } from './services/notificacao-ranking.service';
import { NotificacaoLembreteService } from './services/notificacao-lembrete.service';
import { PushService } from './services/push.service';
import { PreferenciaService } from './services/preferencia.service';
import { PontuacaoService } from '../ranking/services/pontuacao.service';
import { TokenDobroService } from '../palpites/services/token-dobro.service';
import { PrismaNotificacaoRepository } from './repositories/prisma-notificacao.repository';
import { PrismaInscricaoPushRepository } from './repositories/prisma-inscricao-push.repository';
import { PrismaPreferenciaRepository } from './repositories/prisma-preferencia.repository';
import { PrismaJogoRepository } from '../jogos/repositories/prisma-jogo.repository';
import { PrismaFaseRepository } from '../jogos/repositories/prisma-fase.repository';
import { PrismaPalpiteRepository } from '../palpites/repositories/prisma-palpite.repository';
import { PrismaPalpiteDobradoRepository } from '../palpites/repositories/prisma-palpite-dobrado.repository';
import { PrismaTokenDobroRepository } from '../palpites/repositories/prisma-token-dobro.repository';
import { PrismaGrupoUsuarioRepository } from '../grupo-usuario/repositories/prisma-grupo-usuario.repository';
import { PrismaGrupoRepository } from '../grupos/repositories/prisma-grupo.repository';

@Module({
  imports: [ConfigModule],
  controllers: [NotificacaoController, PushController, PreferenciaController],
  providers: [
    // Services do módulo
    NotificacaoService,
    NotificacaoEventService,
    NotificacaoAcertoService,
    NotificacaoRodadaService,
    NotificacaoRankingService,
    NotificacaoLembreteService,
    PushService,
    PreferenciaService,
    // Services de outros módulos (instanciados localmente para evitar circular deps)
    PontuacaoService,
    TokenDobroService,
    // Repositories próprios
    {
      provide: NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN,
      useClass: PrismaNotificacaoRepository,
    },
    {
      provide: NOTIFICACOES.INSCRICAO_PUSH_REPOSITORY_TOKEN,
      useClass: PrismaInscricaoPushRepository,
    },
    {
      provide: NOTIFICACOES.PREFERENCIA_REPOSITORY_TOKEN,
      useClass: PrismaPreferenciaRepository,
    },
    {
      provide: NOTIFICACOES.EVENT_SERVICE_TOKEN,
      useExisting: NotificacaoEventService,
    },
    // Repositories de outros módulos (instanciados localmente)
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
    {
      provide: PALPITES.TOKEN_DOBRO_REPOSITORY_TOKEN,
      useClass: PrismaTokenDobroRepository,
    },
    {
      provide: GRUPO_USUARIO.REPOSITORY_TOKEN,
      useClass: PrismaGrupoUsuarioRepository,
    },
    { provide: GRUPOS.REPOSITORY_TOKEN, useClass: PrismaGrupoRepository },
  ],
  exports: [
    NotificacaoEventService,
    NotificacaoService,
    NOTIFICACOES.EVENT_SERVICE_TOKEN,
  ],
})
export class NotificacoesModule {}

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { JogosModule } from '../jogos/jogos.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { EventosModule } from '../eventos/eventos.module';
import { AdvisoryLockService } from './services/advisory-lock.service';
import { SyncPolicyService } from './services/sync-policy.service';
import { ExecutarSincronizacao } from './use-cases/executar-sincronizacao';
import { ExecutarNotificacoes } from './use-cases/executar-notificacoes';
import { ExecutarLimpeza } from './use-cases/executar-limpeza';
import { SincronizacaoScheduler } from './schedulers/sincronizacao.scheduler';
import { NotificacaoScheduler } from './schedulers/notificacao.scheduler';
import { ManutencaoScheduler } from './schedulers/manutencao.scheduler';
import { SchedulerController } from './scheduler.controller';

/**
 * Módulo Scheduler — centraliza todos os agendamentos do sistema.
 *
 * Responsabilidade: saber QUANDO executar.
 * Delega o QUE executar para use cases.
 * Delega o COMO executar para os módulos de domínio.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    JogosModule,
    NotificacoesModule,
    EventosModule,
  ],
  controllers: [SchedulerController],
  providers: [
    // Services
    AdvisoryLockService,
    SyncPolicyService,
    // Use Cases
    ExecutarSincronizacao,
    ExecutarNotificacoes,
    ExecutarLimpeza,
    // Schedulers
    SincronizacaoScheduler,
    NotificacaoScheduler,
    ManutencaoScheduler,
  ],
  exports: [ExecutarSincronizacao, ExecutarNotificacoes, ExecutarLimpeza],
})
export class SchedulerModule {}

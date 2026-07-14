import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdvisoryLockService } from './services/advisory-lock.service';
import { SyncPolicyService } from './services/sync-policy.service';

/**
 * Módulo Scheduler — centraliza todos os agendamentos do sistema.
 *
 * Responsabilidade: saber QUANDO executar.
 * Delega o QUE executar para use cases.
 * Delega o COMO executar para os módulos de domínio.
 *
 * Fase 1: infraestrutura base (lock, policy).
 * Use cases e schedulers serão adicionados nas fases seguintes.
 */
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [AdvisoryLockService, SyncPolicyService],
  exports: [AdvisoryLockService, SyncPolicyService],
})
export class SchedulerModule {}

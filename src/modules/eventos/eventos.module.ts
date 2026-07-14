import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EVENTOS } from './eventos.constants';
import { PrismaEventoPendenteRepository } from './repositories/prisma-evento-pendente.repository';
import { EventoPendenteService } from './services/evento-pendente.service';

/**
 * Módulo Eventos — outbox pattern local.
 *
 * Responsabilidade: registrar e processar efeitos derivados pendentes.
 * Outros módulos (Jogos, Ranking, Notificações) registram eventos aqui.
 * O Scheduler chama processarPendentes() periodicamente.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: EVENTOS.REPOSITORY_TOKEN,
      useClass: PrismaEventoPendenteRepository,
    },
    EventoPendenteService,
  ],
  exports: [EventoPendenteService],
})
export class EventosModule {}

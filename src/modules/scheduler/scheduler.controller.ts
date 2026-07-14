import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import {
  SCHEDULER,
  USE_CASES_PERMITIDOS,
  type UseCasePermitido,
} from './scheduler.constants';
import { ExecutarSincronizacao } from './use-cases/executar-sincronizacao';
import { ExecutarNotificacoes } from './use-cases/executar-notificacoes';
import { ExecutarLimpeza } from './use-cases/executar-limpeza';
import { EventoPendenteService } from '../eventos/services/evento-pendente.service';
import { SincronizacaoScheduler } from './schedulers/sincronizacao.scheduler';

@ApiTags(SCHEDULER.TAG)
@Controller('scheduler')
@UseGuards(SuperAdminGuard)
export class SchedulerController {
  constructor(
    private readonly executarSincronizacao: ExecutarSincronizacao,
    private readonly executarNotificacoes: ExecutarNotificacoes,
    private readonly executarLimpeza: ExecutarLimpeza,
    private readonly eventoPendenteService: EventoPendenteService,
    private readonly sincScheduler: SincronizacaoScheduler,
  ) {}

  @ApiOperation({ summary: 'Obter status de todos os jobs do scheduler' })
  @ApiResponse({ status: 200, description: 'Status retornado.' })
  @Get('status')
  async obterStatus() {
    const eventosPendentes = await this.eventoPendenteService.contarPendentes();
    return {
      sincronizacao: this.sincScheduler.obterEstado(),
      eventosPendentes,
    };
  }

  @ApiOperation({ summary: 'Forçar execução de um use case' })
  @ApiResponse({ status: 200, description: 'Execução concluída.' })
  @Post('executar/:useCase')
  async executar(@Param('useCase') useCase: string) {
    if (!USE_CASES_PERMITIDOS.includes(useCase as UseCasePermitido)) {
      throw new BadRequestException(
        `${SCHEDULER.MENSAGENS.USE_CASE_INVALIDO}. Permitidos: ${USE_CASES_PERMITIDOS.join(', ')}`,
      );
    }

    switch (useCase as UseCasePermitido) {
      case 'sincronizacao':
        return this.executarSincronizacao.execute({
          trigger: 'SUPER_ADMIN',
        });
      case 'notificacoes':
        await this.executarNotificacoes.executarTudo({
          trigger: 'SUPER_ADMIN',
        });
        return { mensagem: 'Notificações executadas' };
      case 'limpeza':
        await this.executarLimpeza.execute({ trigger: 'SUPER_ADMIN' });
        return { mensagem: 'Limpeza executada' };
      case 'eventos-pendentes':
        return this.eventoPendenteService.processarPendentes();
    }
  }
}

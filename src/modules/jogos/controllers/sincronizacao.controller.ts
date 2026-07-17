import {
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { ErrorFactory } from '../../../common/errors/error.factory';
import { ConfigService } from '@nestjs/config';
import { ExecutarSincronizacao } from '../../scheduler/use-cases/executar-sincronizacao';
import { JOGOS } from '../jogos.constants';
import type { LogSincronizacaoRepository } from '../repositories/log-sincronizacao.repository.interface';

@ApiTags('Sincronização')
@Controller('sincronizacao')
export class SincronizacaoController {
  constructor(
    private readonly executarSincronizacao: ExecutarSincronizacao,
    private readonly configService: ConfigService,
    @Inject(JOGOS.LOG_SINCRONIZACAO_REPOSITORY_TOKEN)
    private readonly logRepo: LogSincronizacaoRepository,
  ) {}

  @ApiOperation({ summary: 'Obter status da sincronização automática' })
  @ApiResponse({ status: 200, description: 'Status retornado com sucesso' })
  @UseGuards(SuperAdminGuard)
  @Get('status')
  async obterStatus() {
    return { mensagem: 'Use GET /scheduler/status para status completo' };
  }

  @ApiOperation({ summary: 'Listar logs recentes de sincronização' })
  @ApiResponse({ status: 200, description: 'Logs retornados com sucesso' })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiQuery({ name: 'campeonato', required: false, type: String })
  @UseGuards(SuperAdminGuard)
  @Get('logs')
  async listarLogs(
    @Query('limite') limite?: string,
    @Query('campeonato') campeonato?: string,
  ) {
    const limiteNum = limite ? Number.parseInt(limite, 10) : undefined;

    if (campeonato) {
      return this.logRepo.buscarPorCampeonato(campeonato, limiteNum);
    }

    return this.logRepo.buscarRecentes(limiteNum);
  }

  @ApiOperation({ summary: 'Forçar sincronização (SUPER_ADMIN ou API Key)' })
  @ApiResponse({ status: 200, description: 'Sincronização executada' })
  @ApiHeader({
    name: 'x-sync-api-key',
    required: false,
    description: 'API key para trigger externo',
  })
  @Public()
  @Post('forcar')
  async forcarSincronizacao(@Headers('x-sync-api-key') apiKey?: string) {
    const syncApiKey = this.configService.get<string>('SYNC_API_KEY');

    if (!syncApiKey) {
      throw ErrorFactory.forbidden('SYNC_API_KEY não configurada no servidor');
    }

    if (apiKey !== syncApiKey) {
      throw ErrorFactory.forbidden('API key inválida');
    }

    const resultado = await this.executarSincronizacao.execute({
      trigger: 'API_KEY',
    });

    return {
      mensagem: 'Sincronização forçada executada com sucesso',
      ...resultado,
    };
  }
}

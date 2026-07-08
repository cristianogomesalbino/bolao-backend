import { Controller, Get, Patch, Body, HttpCode } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NOTIFICACOES } from '../notificacoes.constants';
import { PreferenciaService } from '../services/preferencia.service';
import { AtualizarPreferenciasDto } from '../dto/atualizar-preferencias.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags(NOTIFICACOES.TAG)
@ApiBearerAuth()
@Controller('notificacoes/preferencias')
export class PreferenciaController {
  constructor(private readonly preferenciaService: PreferenciaService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar preferências de notificação' })
  @ApiResponse({ status: 200, description: 'Preferências retornadas' })
  async buscar(@CurrentUser() usuario: any) {
    const preferencias = await this.preferenciaService.buscar(usuario.id);
    return {
      jogoProximo: preferencias.jogoProximo,
      rodadaEncerrada: preferencias.rodadaEncerrada,
      acertoEmCheio: preferencias.acertoEmCheio,
      subiuPosicao: preferencias.subiuPosicao,
      desceuPosicao: preferencias.desceuPosicao,
      palpitesPendentes: preferencias.palpitesPendentes,
      jogoLiberado: preferencias.jogoLiberado,
    };
  }

  @Patch()
  @HttpCode(200)
  @ApiOperation({ summary: 'Atualizar preferências de notificação' })
  @ApiResponse({ status: 200, description: 'Preferências atualizadas' })
  async atualizar(
    @CurrentUser() usuario: any,
    @Body() dto: AtualizarPreferenciasDto,
  ) {
    await this.preferenciaService.atualizar(usuario.id, dto);
    return { mensagem: NOTIFICACOES.MENSAGENS.PREFERENCIAS_ATUALIZADAS };
  }
}

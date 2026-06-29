import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NOTIFICACOES } from '../notificacoes.constants';
import { NotificacaoService } from '../services/notificacao.service';
import { ListarNotificacoesDto } from '../dto/listar-notificacoes.dto';
import { NotificacaoPresenter } from '../../../common/presenters/notificacao.presenter';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';

@ApiTags(NOTIFICACOES.TAG)
@ApiBearerAuth()
@Controller('notificacoes')
export class NotificacaoController {
  constructor(private readonly notificacaoService: NotificacaoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de notificações paginada' })
  async listar(
    @CurrentUser() usuario: any,
    @Query() dto: ListarNotificacoesDto,
  ) {
    const filtros = {
      limit: dto.limit ?? NOTIFICACOES.LIMITES.LISTAGEM_LIMIT_DEFAULT,
      offset: dto.offset ?? 0,
      status: dto.status,
    };

    const resultado = await this.notificacaoService.listar(
      usuario.id,
      filtros,
    );

    return {
      notificacoes: resultado.notificacoes.map(NotificacaoPresenter.toHttp),
      total: resultado.total,
      naoLidas: resultado.naoLidas,
    };
  }

  @Get('nao-lidas/contagem')
  @ApiOperation({ summary: 'Contagem de notificações não lidas' })
  @ApiResponse({ status: 200, description: 'Contagem retornada' })
  async contarNaoLidas(@CurrentUser() usuario: any) {
    const naoLidas = await this.notificacaoService.contarNaoLidas(usuario.id);
    return { naoLidas };
  }

  @Patch(':id/lida')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
  async marcarComoLida(
    @CurrentUser() usuario: any,
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
  ) {
    await this.notificacaoService.marcarComoLida(id, usuario.id);
    return { mensagem: NOTIFICACOES.MENSAGENS.NOTIFICACAO_MARCADA_LIDA };
  }

  @Patch('marcar-todas-lidas')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({
    status: 200,
    description: 'Todas as notificações foram marcadas como lidas',
  })
  async marcarTodasComoLidas(@CurrentUser() usuario: any) {
    const total = await this.notificacaoService.marcarTodasComoLidas(
      usuario.id,
    );
    return {
      mensagem: NOTIFICACOES.MENSAGENS.TODAS_MARCADAS_LIDAS,
      total,
    };
  }
}

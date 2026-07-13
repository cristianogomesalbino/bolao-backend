import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NOTIFICACOES } from '../notificacoes.constants';
import { PushService } from '../services/push.service';
import { InscreverPushDto } from '../dto/inscrever-push.dto';
import { CancelarPushDto } from '../dto/cancelar-push.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';

@ApiTags(NOTIFICACOES.TAG)
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('inscrever')
  @HttpCode(201)
  @ApiOperation({ summary: 'Registrar inscrição push' })
  @ApiResponse({ status: 201, description: 'Inscrição registrada' })
  async inscrever(
    @CurrentUser() usuario: { id: string },
    @Body() dto: InscreverPushDto,
  ) {
    await this.pushService.inscrever(
      usuario.id,
      dto.endpoint,
      dto.keys.p256dh,
      dto.keys.auth,
    );
    return { mensagem: NOTIFICACOES.MENSAGENS.INSCRICAO_CRIADA };
  }

  @Delete('cancelar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancelar inscrição push' })
  @ApiResponse({ status: 200, description: 'Inscrição removida' })
  async cancelar(
    @CurrentUser() usuario: { id: string },
    @Body() dto: CancelarPushDto,
  ) {
    await this.pushService.cancelar(usuario.id, dto.endpoint);
    return { mensagem: NOTIFICACOES.MENSAGENS.INSCRICAO_REMOVIDA };
  }

  @Post('testar')
  @UseGuards(SuperAdminGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Enviar push de teste para o usuário logado' })
  @ApiResponse({ status: 200, description: 'Push enviado' })
  async testar(
    @CurrentUser() usuario: { id: string },
    @Body() body: { tipo?: string },
  ) {
    const tipo = body.tipo ?? 'JOGO_PROXIMO';
    const mensagens: Record<string, { titulo: string; mensagem: string }> = {
      JOGO_PROXIMO: {
        titulo: '⚽ Jogo em 10 minutos!',
        mensagem: 'Brasil × Argentina começa em breve!',
      },
      ACERTO_EM_CHEIO: {
        titulo: '🎯 Na mosca!',
        mensagem: 'Você acertou em cheio! Brasil 2 × 1 Argentina (+3 pontos)',
      },
      JOGO_LIBERADO: {
        titulo: '🏆 Jogo liberado!',
        mensagem: 'O jogo França × Espanha está definido. Dê seu palpite!',
      },
      RODADA_ENCERRADA: {
        titulo: '🏁 Rodada encerrada!',
        mensagem: 'Rodada 3 da Copa do Mundo encerrada! Confira o ranking.',
      },
      SUBIU_POSICAO: {
        titulo: '📈 Subiu no ranking!',
        mensagem: 'Você subiu para 2º lugar no grupo!',
      },
      DESCEU_POSICAO: {
        titulo: '📉 Desceu no ranking',
        mensagem: 'Você caiu para 5º lugar no grupo.',
      },
      PALPITES_PENDENTES: {
        titulo: '⏰ Palpites pendentes!',
        mensagem: 'Faltam 3 palpites para a rodada 4! Não esqueça.',
      },
    };

    const template = mensagens[tipo] ?? mensagens.JOGO_PROXIMO;
    await this.pushService.enviarParaUsuario(usuario.id, {
      titulo: template.titulo,
      mensagem: template.mensagem,
      tipo,
      url: '/palpites',
    });
    return { mensagem: `Push de teste (${tipo}) enviado` };
  }
}

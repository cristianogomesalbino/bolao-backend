import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
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
    @CurrentUser() usuario: any,
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
    @CurrentUser() usuario: any,
    @Body() dto: CancelarPushDto,
  ) {
    await this.pushService.cancelar(usuario.id, dto.endpoint);
    return { mensagem: NOTIFICACOES.MENSAGENS.INSCRICAO_REMOVIDA };
  }
}

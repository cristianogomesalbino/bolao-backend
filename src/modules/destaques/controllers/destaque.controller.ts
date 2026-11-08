import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DESTAQUES } from '../destaques.constants';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GroupRoleGuard } from '../../../common/guards/group-role.guard';
import { GroupRoles } from '../../../common/decorators/group-roles.decorator';
import { GRUPO_ROLE } from '../../../common/constants/roles.constants';
import { DestaqueReactionService } from '../services/destaque-reaction.service';
import { DestaqueListagemService } from '../services/destaque-listagem.service';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';
import { MarcarVisualizadosDto } from '../dto/marcar-visualizados.dto';

@ApiTags(DESTAQUES.TAG)
@Controller()
export class DestaqueController {
  constructor(
    private readonly listagemService: DestaqueListagemService,
    private readonly reactionService: DestaqueReactionService,
  ) {}

  @Get('grupos/:grupoId/destaques')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({
    summary: 'Listar destaques do grupo na rodada atual',
  })
  @ApiResponse({ status: 200, description: 'Lista de destaques cronológica' })
  async listarDestaques(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @CurrentUser() usuario: { id: string },
    @Query('rodada') rodadaQuery?: string,
  ) {
    return this.listagemService.listar(grupoId, usuario.id, rodadaQuery);
  }

  @Post('grupos/:grupoId/destaques/:destaqueId/mandar-f')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({ summary: 'Enviar um F para destaque NAO_PALPITOU' })
  @ApiResponse({ status: 200, description: 'F enviado com sucesso' })
  async mandarF(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('destaqueId', new ParseUUIDCustomPipe('destaqueId'))
    destaqueId: string,
    @CurrentUser() usuario: { id: string },
  ) {
    const rodadasVisiveis =
      await this.listagemService.obterRodadasVisiveis(grupoId);

    const contadorFs = await this.reactionService.mandarF(
      destaqueId,
      usuario.id,
      grupoId,
      rodadasVisiveis,
    );

    return { contadorFs };
  }

  @Post('grupos/:grupoId/destaques/visualizar')
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @ApiOperation({ summary: 'Marcar destaques como visualizados (batch)' })
  @ApiResponse({ status: 200, description: 'Visualizações registradas' })
  async marcarVisualizados(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Body() body: MarcarVisualizadosDto,
    @CurrentUser() usuario: { id: string },
  ) {
    return this.listagemService.marcarVisualizados(
      grupoId,
      usuario.id,
      body.destaqueIds,
    );
  }
}

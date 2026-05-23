import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PainelRodadaService } from '../services/painel-rodada.service';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GroupRoleGuard } from '../../../common/guards/group-role.guard';
import { GroupRoles } from '../../../common/decorators/group-roles.decorator';
import { PALPITES } from '../palpites.constants';
import { GRUPO_ROLE } from '../../../common/constants/roles.constants';

@ApiTags(PALPITES.TAG)
@Controller('grupos')
export class PainelRodadaController {
  constructor(private readonly painelRodadaService: PainelRodadaService) {}

  @ApiOperation({ summary: 'Obter painel da rodada com jogos, palpites e dobros' })
  @ApiResponse({ status: 200, description: 'Painel da rodada retornado com sucesso.' })
  @ApiQuery({ name: 'rodada', required: false, type: Number, description: 'Filtrar por rodada' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get(':grupoId/painel-rodada/:faseId')
  async obterPainelRodada(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('faseId', new ParseUUIDCustomPipe('faseId')) faseId: string,
    @Query('rodada') rodada: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    const rodadaNum = rodada ? Number.parseInt(rodada, 10) : undefined;
    return this.painelRodadaService.obterPainelRodada(grupoId, faseId, user.id, rodadaNum);
  }
}

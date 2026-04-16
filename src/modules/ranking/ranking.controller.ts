import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { RankingService } from './ranking.service';
import { RANKING } from './ranking.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';
import { GroupRoleGuard } from '../../common/guards/group-role.guard';
import { GroupRoles } from '../../common/decorators/group-roles.decorator';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';
import { RankingPresenter, PontuacaoJogoPresenter } from '../../common/presenters';

@ApiTags(RANKING.TAG)
@Controller('grupos')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @ApiOperation({ summary: 'Obter ranking geral da temporada do grupo' })
  @ApiResponse({ status: 200, description: 'Ranking geral retornado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get(':grupoId/ranking/geral')
  async obterRankingGeral(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
  ) {
    const ranking = await this.rankingService.obterRankingGeral(grupoId);
    return ranking.map((entry) => RankingPresenter.toHttp(entry));
  }

  @ApiOperation({ summary: 'Obter ranking de uma fase específica do grupo' })
  @ApiResponse({ status: 200, description: 'Ranking da fase retornado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Grupo ou fase não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get(':grupoId/ranking/fases/:faseId')
  async obterRankingFase(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('faseId', new ParseUUIDCustomPipe('faseId')) faseId: string,
  ) {
    const ranking = await this.rankingService.obterRankingFase(grupoId, faseId);
    return ranking.map((entry) => RankingPresenter.toHttp(entry));
  }

  @ApiOperation({ summary: 'Obter detalhamento de pontuação de um jogo no grupo' })
  @ApiResponse({ status: 200, description: 'Detalhamento de pontuação retornado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Grupo ou jogo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get(':grupoId/ranking/jogos/:jogoId')
  async obterDetalhamentoJogo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('jogoId', new ParseUUIDCustomPipe('jogoId')) jogoId: string,
  ) {
    const detalhamento = await this.rankingService.obterDetalhamentoJogo(grupoId, jogoId);
    return detalhamento.map((entry) => PontuacaoJogoPresenter.toHttp(entry));
  }

  @ApiOperation({ summary: 'Processar pontuação de um jogo finalizado' })
  @ApiResponse({ status: 200, description: 'Pontuação processada com sucesso.' })
  @ApiBadRequestResponse({ description: 'Jogo não finalizado.' })
  @ApiNotFoundResponse({ description: 'Jogo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Post(':grupoId/ranking/processar-jogo/:jogoId')
  async processarPontuacaoJogo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) _grupoId: string,
    @Param('jogoId', new ParseUUIDCustomPipe('jogoId')) jogoId: string,
  ) {
    await this.rankingService.processarPontuacaoJogo(jogoId);
    return { mensagem: RANKING.MENSAGENS.PONTUACAO_PROCESSADA };
  }
}

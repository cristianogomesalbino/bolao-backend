import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { PalpiteDobradoService } from '../services/palpite-dobrado.service';
import { TokenDobroService } from '../services/token-dobro.service';
import { ConfigurarDobroDto } from '../dto/configurar-dobro.dto';
import { ParseUUIDCustomPipe } from '../../../common/pipes/parse-uuid-custom.pipe';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { GroupRoleGuard } from '../../../common/guards/group-role.guard';
import { GroupRoles } from '../../../common/decorators/group-roles.decorator';
import { PALPITES } from '../palpites.constants';
import { GRUPO_ROLE } from '../../../common/constants/roles.constants';
import {
  PalpiteDobradoPresenter,
  TokenDobroPresenter,
} from '../../../common/presenters';

@ApiTags(PALPITES.TAG)
@Controller('grupos')
export class PalpiteDobradoController {
  constructor(
    private readonly palpiteDobradoService: PalpiteDobradoService,
    private readonly tokenDobroService: TokenDobroService,
  ) {}

  @ApiOperation({ summary: 'Ativar palpite dobrado em um jogo' })
  @ApiResponse({ status: 201, description: 'Dobro ativado com sucesso.' })
  @ApiBadRequestResponse({
    description: 'Grupo não permite dobro ou sem fichas.',
  })
  @ApiConflictResponse({ description: 'Dobro já ativo para este jogo.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Post(':grupoId/jogos/:jogoId/dobro')
  async ativarDobro(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('jogoId', new ParseUUIDCustomPipe('jogoId')) jogoId: string,
    @CurrentUser() user: { id: string },
  ) {
    return PalpiteDobradoPresenter.toHttp(
      await this.palpiteDobradoService.ativarDobro(grupoId, jogoId, user.id),
    );
  }

  @ApiOperation({ summary: 'Desativar palpite dobrado de um jogo' })
  @ApiResponse({ status: 200, description: 'Dobro desativado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Jogo já começou.' })
  @ApiNotFoundResponse({ description: 'Dobro não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Delete(':grupoId/jogos/:jogoId/dobro')
  async desativarDobro(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('jogoId', new ParseUUIDCustomPipe('jogoId')) jogoId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.palpiteDobradoService.desativarDobro(grupoId, jogoId, user.id);
    return { mensagem: PALPITES.MENSAGENS.DOBRO_DESATIVADO };
  }

  @ApiOperation({ summary: 'Consultar saldo de fichas de dobro' })
  @ApiResponse({ status: 200, description: 'Saldo retornado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get(':grupoId/tokens-dobro/saldo')
  async consultarSaldo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @CurrentUser() user: { id: string },
  ) {
    const saldo = await this.tokenDobroService.calcularSaldo(user.id, grupoId);
    return { saldo };
  }

  @ApiOperation({ summary: 'Consultar histórico de fichas de dobro' })
  @ApiResponse({ status: 200, description: 'Histórico retornado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get(':grupoId/tokens-dobro/historico')
  async consultarHistorico(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @CurrentUser() user: { id: string },
  ) {
    const historico = await this.tokenDobroService.listarHistorico(
      user.id,
      grupoId,
    );
    return historico.map((t) => TokenDobroPresenter.toHttp(t));
  }

  @ApiOperation({ summary: 'Configurar palpite dobrado no grupo' })
  @ApiResponse({ status: 200, description: 'Configuração atualizada.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Patch(':grupoId/configuracao-dobro')
  async configurarDobro(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Body() dto: ConfigurarDobroDto,
  ) {
    await this.palpiteDobradoService.atualizarConfiguracaoDobro(
      grupoId,
      dto.permitirPalpiteDobrado,
    );
    return { mensagem: PALPITES.MENSAGENS.CONFIGURACAO_ATUALIZADA };
  }

  @ApiOperation({ summary: 'Listar meus palpites dobrados no grupo' })
  @ApiResponse({ status: 200, description: 'Lista de jogos dobrados.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get(':grupoId/meus-dobros')
  async listarMeusDobros(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @CurrentUser() user: { id: string },
  ) {
    const dobros = await this.palpiteDobradoService.listarMeusDobros(
      grupoId,
      user.id,
    );
    return dobros.map((d) => PalpiteDobradoPresenter.toHttp(d));
  }
}

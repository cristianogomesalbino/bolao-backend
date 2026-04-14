import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { CriarGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { UpdateStatusGrupoDto } from './dto/update-status-grupo.dto';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { GroupRoleGuard } from '../../common/guards/group-role.guard';
import { GroupRoles } from '../../common/decorators/group-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GRUPOS } from './grupos.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';
import { GrupoPresenter } from '../../common/presenters';

@ApiTags(GRUPOS.TAG)
@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @ApiOperation({ summary: 'Criar um novo grupo' })
  @ApiResponse({ status: 201, description: 'Grupo criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Temporada não encontrada.' })
  @Post()
  async criarGrupo(
    @Body() criarGrupoDto: CriarGrupoDto,
    @CurrentUser() user,
  ) {
    return GrupoPresenter.toHttp(await this.gruposService.criar(criarGrupoDto, user.id));
  }

  @ApiOperation({ summary: 'Listar todos os grupos ativos' })
  @ApiResponse({ status: 200, description: 'Lista de grupos retornada com sucesso.' })
  @Get()
  async buscarGrupos() {
    const grupos = await this.gruposService.buscarTodos();
    return grupos.map((g) => GrupoPresenter.toHttp(g));
  }

  @ApiOperation({ summary: 'Buscar grupo por ID' })
  @ApiResponse({ status: 200, description: 'Grupo encontrado.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @Get(':grupoId')
  async buscarGrupoPorId(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
  ) {
    return GrupoPresenter.toHttp(await this.gruposService.buscarPorId(grupoId));
  }

  @ApiOperation({ summary: 'Atualizar grupo por ID' })
  @ApiResponse({ status: 200, description: 'Grupo atualizado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Patch(':grupoId')
  async atualizarGrupo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Body() updateGrupoDto: UpdateGrupoDto,
  ) {
    return GrupoPresenter.toHttp(await this.gruposService.atualizar(grupoId, updateGrupoDto));
  }

  @ApiOperation({ summary: 'Alterar status (ativo/inativo) do grupo' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Patch(':grupoId/status')
  async atualizarStatusGrupo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Body() updateStatusGrupoDto: UpdateStatusGrupoDto,
  ) {
    return GrupoPresenter.toHttp(await this.gruposService.atualizarStatus(grupoId, updateStatusGrupoDto));
  }

  @ApiOperation({ summary: 'Exclui um grupo inativo' })
  @ApiResponse({ status: 200, description: 'Grupo excluído com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Delete(':grupoId')
  removerGrupo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
  ) {
    return this.gruposService.remover(grupoId);
  }
}

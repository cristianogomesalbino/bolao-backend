import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { CriarGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { UpdateStatusGrupoDto } from './dto/update-status-grupo.dto';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse,} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupRoleGuard } from '../auth/group-role.guard';
import { GroupRoles } from '../auth/group-roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Grupos')
@UseGuards(JwtAuthGuard)
@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @ApiOperation({ summary: 'Criar um novo grupo' })
  @ApiResponse({ status: 201, description: 'Grupo criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Temporada ou administrador não encontrado.' })
  @Post()
  criarGrupo(
    @Body() criarGrupoDto: CriarGrupoDto,
    @CurrentUser() user,
  ) {
    return this.gruposService.criar(criarGrupoDto, user.id);
  }

  @ApiOperation({ summary: 'Listar todos os grupos ativos' })
  @ApiResponse({ status: 200, description: 'Lista de grupos retornada com sucesso.' })
  @Get()
  buscarGrupos() {
    return this.gruposService.buscarTodos();
  }

  @ApiOperation({ summary: 'Buscar grupo por ID' })
  @ApiResponse({ status: 200, description: 'Lista de grupos retornada com sucesso.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @Get(':grupoId')
  buscarGrupoPorId(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string
  ) {
    return this.gruposService.buscarPorId(grupoId);
  }

  @ApiOperation({ summary: 'Atualizar grupo por ID' })
  @ApiResponse({ status: 200, description: 'Grupo encontrado.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards( GroupRoleGuard)
  @GroupRoles('ADMIN')
  @Patch(':grupoId')
  atualizarGrupo(
    @Param('grupoId') grupoId: string, 
    @Body() updateGrupoDto: UpdateGrupoDto
  ) {
    return this.gruposService.atualizar(grupoId, updateGrupoDto);
  }

  @ApiOperation({ summary: 'Alterar status (ativo/inativo) do grupo' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards( GroupRoleGuard)
  @Patch(':grupoId/status')
  @GroupRoles('ADMIN')
  atualizarStatusGrupo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Body() updateStatusGrupoDto: UpdateStatusGrupoDto,
  ) {
    return this.gruposService.atualizarStatus(grupoId, updateStatusGrupoDto);
  }

  @ApiOperation({ summary: 'Exclui um grupo inativo' })
  @ApiResponse({ status: 200, description: 'Grupo excluído com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards( GroupRoleGuard)
  @GroupRoles('ADMIN')
  @Delete(':grupoId')
  removerGrupo(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
  ) {
    return this.gruposService.remover(grupoId);
  }

  }

import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
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

@ApiTags('Grupos')
@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @ApiOperation({ summary: 'Criar um novo grupo' })
  @ApiResponse({ status: 201, description: 'Grupo criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Temporada ou administrador não encontrado.' })
  @UseGuards(JwtAuthGuard)
  @Post()
  criarGrupo(@Body() criarGrupoDto: CriarGrupoDto) {
    return this.gruposService.criar(criarGrupoDto);
  }

  @ApiOperation({ summary: 'Listar todos os grupos ativos' })
  @ApiResponse({ status: 200, description: 'Lista de grupos retornada com sucesso.' })
  @Get()
  findAll() {
    return this.gruposService.buscarTodos();
  }

  @ApiOperation({ summary: 'Listar todos os grupos ativos' })
  @ApiResponse({ status: 200, description: 'Lista de grupos retornada com sucesso.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gruposService.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Buscar grupo por ID' })
  @ApiResponse({ status: 200, description: 'Grupo encontrado.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGrupoDto: UpdateGrupoDto) {
    return this.gruposService.atualizar(id, updateGrupoDto);
  }

  @ApiOperation({ summary: 'Alterar status (ativo/inativo) do grupo' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDCustomPipe('id'))
  id: string,
    @Body() dto: UpdateStatusGrupoDto,
  ) {
    return this.gruposService.updateStatus(id, dto);
  }

  @ApiOperation({ summary: 'Exclui um grupo inativo' })
  @ApiResponse({ status: 200, description: 'Grupo excluído com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(JwtAuthGuard, GroupRoleGuard)
  @GroupRoles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDCustomPipe('id'))
    id: string,
  ) {
    return this.gruposService.remover(id);
  }

  }

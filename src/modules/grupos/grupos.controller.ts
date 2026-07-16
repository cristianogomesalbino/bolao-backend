import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { GruposService } from './grupos.service';
import { CriarGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { UpdateStatusGrupoDto } from './dto/update-status-grupo.dto';
import { FiltrarGruposDto } from './dto/filtrar-grupos.dto';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { GroupRoleGuard } from '../../common/guards/group-role.guard';
import { GroupRoles } from '../../common/decorators/group-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { GRUPOS } from './grupos.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';
import { GrupoPresenter } from '../../common/presenters';

interface GrupoComRelacoes {
  id: string;
  nome: string;
  icone: string | null;
  temporadaId: string;
  privado: boolean;
  codigoConvite: string | null;
  permitirPalpiteAutomatico: boolean;
  maxParticipantes: number;
  permitirPalpiteDobrado: boolean;
  ativo: boolean;
  dataCriacao: Date;
  criadoPor: string;
  ehMembro?: boolean;
  _count?: { usuarios: number };
  temporada?: {
    id: string;
    ano: number;
    campeonatoId: string;
    dataCriacao: Date;
    campeonato?: {
      id: string;
      nome: string;
      dataCriacao: Date;
      atualizadoEm: Date;
    };
  };
  usuarios?: Array<{ role: string }>;
}

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
    @CurrentUser() user: { id: string },
  ) {
    const grupo = (await this.gruposService.criar(
      criarGrupoDto,
      user.id,
    )) as GrupoComRelacoes;
    return GrupoPresenter.toHttp(grupo);
  }

  @ApiOperation({ summary: 'Listar grupos com filtros opcionais' })
  @ApiResponse({
    status: 200,
    description: 'Lista de grupos retornada com sucesso.',
  })
  @ApiQuery({
    name: 'membro',
    required: false,
    type: Boolean,
    description: 'Filtrar apenas grupos onde o usuário é membro',
  })
  @ApiQuery({
    name: 'privado',
    required: false,
    type: Boolean,
    description: 'Filtrar por visibilidade (false = apenas públicos)',
  })
  @ApiQuery({
    name: 'busca',
    required: false,
    type: String,
    description: 'Busca por nome do grupo (parcial, case-insensitive)',
  })
  @Get()
  async buscarGrupos(
    @Query() filtros: FiltrarGruposDto,
    @CurrentUser() user: { id: string },
  ) {
    const grupos = (await this.gruposService.buscarTodos(
      filtros,
      user.id,
    )) as GrupoComRelacoes[];
    return grupos.map((g) => GrupoPresenter.toHttp(g));
  }

  @ApiOperation({
    summary: 'Buscar informações públicas do grupo por código de convite',
  })
  @ApiResponse({ status: 200, description: 'Informações do grupo retornadas.' })
  @ApiNotFoundResponse({ description: 'Código de convite inválido.' })
  @Public()
  @Get('convite/:codigo/info')
  async buscarPorConvite(@Param('codigo') codigo: string) {
    return this.gruposService.buscarInfoPorConvite(codigo);
  }

  @ApiOperation({ summary: 'Buscar grupo por ID' })
  @ApiResponse({ status: 200, description: 'Grupo encontrado.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @Get(':grupoId')
  async buscarGrupoPorId(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @CurrentUser() user: { id: string },
  ) {
    const grupo = (await this.gruposService.buscarPorId(
      grupoId,
      user.id,
    )) as GrupoComRelacoes;
    if (grupo.ehMembro) {
      return GrupoPresenter.toHttpMembro(grupo);
    }
    return GrupoPresenter.toHttpBasico(grupo);
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
    const grupo = (await this.gruposService.atualizar(
      grupoId,
      updateGrupoDto,
    )) as GrupoComRelacoes;
    return GrupoPresenter.toHttp(grupo);
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
    const grupo = (await this.gruposService.atualizarStatus(
      grupoId,
      updateStatusGrupoDto,
    )) as GrupoComRelacoes;
    return GrupoPresenter.toHttp(grupo);
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

  @ApiOperation({ summary: 'Regenerar código de convite do grupo' })
  @ApiResponse({ status: 200, description: 'Código de convite regenerado.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Patch(':grupoId/regenerar-convite')
  async regenerarConvite(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
  ) {
    const grupo = (await this.gruposService.regenerarCodigoConvite(
      grupoId,
    )) as GrupoComRelacoes;
    return {
      codigoConvite: grupo.codigoConvite,
      mensagem: GRUPOS.MENSAGENS.CONVITE_REGENERADO,
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { GrupoUsuarioService } from './grupo-usuario.service';
import { EntrarGrupoDto } from './dto/entrar-grupo.dto';
import { AdicionarMembroDto } from './dto/adicionar-membro.dto';
import { AlterarRoleDto } from './dto/alterar-role.dto';
import { GroupRoleGuard } from '../../common/guards/group-role.guard';
import { GroupRoles } from '../../common/decorators/group-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';
import { GRUPO_USUARIO } from './grupo-usuario.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';
import { GrupoUsuarioPresenter } from '../../common/presenters';

@ApiTags(GRUPO_USUARIO.TAG)
@Controller('grupos')
export class GrupoUsuarioController {
  constructor(private readonly service: GrupoUsuarioService) {}

  @ApiOperation({ summary: 'Entrar em grupo por código de convite' })
  @ApiResponse({ status: 201, description: 'Entrou no grupo com sucesso.' })
  @ApiNotFoundResponse({ description: 'Código de convite inválido.' })
  @ApiConflictResponse({ description: 'Já está no grupo.' })
  @ApiBadRequestResponse({ description: 'Grupo inativo ou limite atingido.' })
  @Post('entrar')
  async entrar(
    @Body() dto: EntrarGrupoDto,
    @CurrentUser() user: { id: string },
  ) {
    return GrupoUsuarioPresenter.toHttp(
      await this.service.entrarPorConvite(dto.codigoConvite, user.id),
    );
  }

  @ApiOperation({ summary: 'Adicionar membro ao grupo por email (admin)' })
  @ApiResponse({ status: 201, description: 'Membro adicionado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Grupo ou usuário não encontrado.' })
  @ApiConflictResponse({ description: 'Usuário já está no grupo.' })
  @ApiBadRequestResponse({ description: 'Grupo inativo ou limite atingido.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Post(':grupoId/adicionar')
  async adicionarMembro(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Body() dto: AdicionarMembroDto,
  ) {
    return GrupoUsuarioPresenter.toHttp(
      await this.service.adicionarPorEmail(grupoId, dto.email),
    );
  }

  @ApiOperation({ summary: 'Listar membros do grupo' })
  @ApiResponse({ status: 200, description: 'Lista de membros retornada.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER)
  @Get(':grupoId/membros')
  async listarMembros(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
  ) {
    const membros = await this.service.listarMembros(grupoId);
    return membros.map((m) => GrupoUsuarioPresenter.toHttp(m));
  }

  @ApiOperation({ summary: 'Sair do grupo' })
  @ApiResponse({ status: 200, description: 'Saiu do grupo com sucesso.' })
  @ApiNotFoundResponse({ description: 'Você não está neste grupo.' })
  @ApiBadRequestResponse({ description: 'Único admin não pode sair.' })
  @Delete(':grupoId/sair')
  sair(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.sair(grupoId, user.id);
  }

  @ApiOperation({ summary: 'Remover usuário do grupo (admin)' })
  @ApiResponse({ status: 200, description: 'Usuário removido do grupo.' })
  @ApiNotFoundResponse({ description: 'Usuário não está no grupo.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Delete(':grupoId/usuarios/:usuarioId')
  removerMembro(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('usuarioId', new ParseUUIDCustomPipe('usuarioId'))
    usuarioId: string,
  ) {
    return this.service.removerMembro(grupoId, usuarioId);
  }

  @ApiOperation({ summary: 'Alterar role de membro (apenas criador)' })
  @ApiResponse({ status: 200, description: 'Role alterado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Usuário não está no grupo.' })
  @ApiBadRequestResponse({
    description: 'Apenas o criador pode alterar roles.',
  })
  @ApiConflictResponse({ description: 'Membro já possui este role.' })
  @ApiQuery({
    name: 'transferir',
    required: false,
    type: Boolean,
    description: 'Transferir propriedade do grupo (apenas ao promover)',
  })
  @UseGuards(GroupRoleGuard)
  @GroupRoles(GRUPO_ROLE.ADMIN)
  @Patch(':grupoId/usuarios/:usuarioId/cargo')
  alterarRole(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('usuarioId', new ParseUUIDCustomPipe('usuarioId')) usuarioId: string,
    @Body() dto: AlterarRoleDto,
    @CurrentUser() user: { id: string },
    @Query('transferir') transferir?: string,
  ) {
    const transferirPropriedade = transferir === 'true';
    return this.service.alterarRole(
      grupoId,
      usuarioId,
      dto.role,
      user.id,
      transferirPropriedade,
    );
  }
}

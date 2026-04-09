import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import { GrupoUsuarioService } from './grupo-usuario.service';
import { AdicionarMembroDto } from './dto/adicionar-membro.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupRoleGuard } from '../auth/group-role.guard';
import { GroupRoles } from '../auth/group-roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';

@ApiTags('Grupo - Membros')
@UseGuards(JwtAuthGuard)
@Controller('grupos')
export class GrupoUsuarioController {
  constructor(private readonly service: GrupoUsuarioService) {}

  @ApiOperation({ summary: 'Adicionar membro ao grupo por email (admin)' })
  @ApiResponse({ status: 201, description: 'Membro adicionado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Grupo ou usuário não encontrado.' })
  @ApiConflictResponse({ description: 'Usuário já está no grupo.' })
  @ApiBadRequestResponse({ description: 'Grupo inativo ou limite atingido.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles('ADMIN')
  @Post(':grupoId/adicionar')
  adicionarMembro(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Body() dto: AdicionarMembroDto,
  ) {
    return this.service.adicionarPorEmail(grupoId, dto.email);
  }

  @ApiOperation({ summary: 'Listar membros do grupo' })
  @ApiResponse({ status: 200, description: 'Lista de membros retornada.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @UseGuards(GroupRoleGuard)
  @GroupRoles('ADMIN', 'MEMBER')
  @Get(':grupoId/membros')
  listarMembros(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
  ) {
    return this.service.listarMembros(grupoId);
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
  @GroupRoles('ADMIN')
  @Delete(':grupoId/usuarios/:usuarioId')
  removerMembro(
    @Param('grupoId', new ParseUUIDCustomPipe('grupoId')) grupoId: string,
    @Param('usuarioId', new ParseUUIDCustomPipe('usuarioId'))
    usuarioId: string,
  ) {
    return this.service.removerMembro(grupoId, usuarioId);
  }
}

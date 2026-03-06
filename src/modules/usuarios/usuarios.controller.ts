import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';

import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ParseUUIDCustomPipe } from '../../common/pipes/parse-uuid-custom.pipe';
import {SelfOrAdminGuard} from '../auth/self-or-admin.guard';

@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @ApiOperation({ summary: 'Criar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso.' })
  @ApiBadRequestResponse({ description: 'Erro de validação.' })
  @Post()
  criarUsuario(@Body() criarUsuarioDto: CriarUsuarioDto) {
    return this.usuariosService.criar(criarUsuarioDto);
  }

  @ApiOperation({ summary: 'Buscar perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso.' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  buscarPerfil(@CurrentUser() user) {
    return this.usuariosService.buscarPorId(user.id);
  }

  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  @Get(':id')
  buscarPorId(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
  ) {
    return this.usuariosService.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Atualizar dados do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  @Patch(':id')
  atualizarUsuario(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
    @Body() atualizarUsuarioDto: AtualizarUsuarioDto,
  ) {
    return this.usuariosService.atualizar(id, atualizarUsuarioDto);
  }

  @ApiOperation({ summary: 'Remover usuário' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  @UseGuards(JwtAuthGuard, SelfOrAdminGuard)
  @Delete(':id')
  removerUsuario(
    @Param('id', new ParseUUIDCustomPipe('id')) id: string,
  ) {
    return this.usuariosService.remover(id);
  }
}

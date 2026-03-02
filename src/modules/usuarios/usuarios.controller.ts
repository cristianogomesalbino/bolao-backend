import { Controller, Post, Body, Get, Param, Patch, Delete} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';

@ApiTags('Usuários')
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @ApiOperation({ summary: 'Criar um novo usuário' })
  @ApiBody({ type: CriarUsuarioDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuário criado com sucesso',
    type: UsuarioResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request',
    
  })
  @Post()
  async criar(@Body() body: CriarUsuarioDto) {
    return this.usuariosService.criar(body);
  }

  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de usuários retornada com sucesso',
    type: [UsuarioResponseDto]
  })
  @Get()
  async listar() {
    return this.usuariosService.listar();  
  }

  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiParam({ 
    name: 'id', 
    description: 'ID do usuário',
    example: 'usr_abc123xyz'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário encontrado',
    type: UsuarioResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuário não encontrado',
    
  })
  @Get(':id')
  async buscar(@Param('id') id: string) {
    return this.usuariosService.buscarPorId(id);
  }

  @ApiOperation({ summary: 'Atualizar informações do usuário' })
  @ApiParam({ 
    name: 'id', 
    description: 'ID do usuário',
    example: 'usr_abc123xyz'
  })
  @ApiBody({ type: AtualizarUsuarioDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário atualizado com sucesso',
    type: UsuarioResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request',
    
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuário não encontrado',
    
  })
  @Patch(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarUsuarioDto,
  ) {
    return this.usuariosService.atualizar(id, body);
  }
  
  @ApiOperation({ summary: 'Remover um usuário' })
  @ApiParam({ 
    name: 'id', 
    description: 'ID do usuário',
    example: 'usr_abc123xyz'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário removido com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuário não encontrado',
    
  })
  @Delete(':id')
  async remover(@Param('id') id: string) {
    return this.usuariosService.remover(id);
  }

}
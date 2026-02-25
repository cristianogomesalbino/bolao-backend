import { Controller, Post, Body, Get, Param, Patch, Delete} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Post()
  async criar(@Body() body: CriarUsuarioDto) {
    return this.usuariosService.criar(body);
  }

  @Get()
  async listar() {
    return this.usuariosService.listar();  
  }

  @Get(':id')
  async buscar(@Param('id') id: string) {
    return this.usuariosService.buscarPorId(id);
  }

  @Patch(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() body: { nome?: string; email?: string; senha?: string },
  ) {
    return this.usuariosService.atualizar(id, body);
  }
  
  @Delete(':id')
  async remover(@Param('id') id: string) {
    return this.usuariosService.remover(id);
  }

}
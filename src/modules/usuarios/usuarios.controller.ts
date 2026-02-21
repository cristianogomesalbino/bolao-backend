import { Controller, Post, Body } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Post()
  async criar(
    @Body() body: { nome: string; email: string; senha: string },
  ) {
    return this.usuariosService.criar(body);
  }
}
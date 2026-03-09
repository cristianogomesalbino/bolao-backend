import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GrupoUsuarioService } from './grupo-usuario.service';
import { AddUsuarioGrupoDto } from './dto/add-usuario-grupo.dto';

@Controller('grupo-usuarios')
export class GrupoUsuarioController {
  constructor(private readonly service: GrupoUsuarioService) {}

  @Post()
  adicionar(@Body() dto: AddUsuarioGrupoDto) {
    return this.service.adicionar(dto);
  }

  @Get('grupo/:grupoId')
  listarUsuarios(@Param('grupoId') grupoId: string) {
    return this.service.listarUsuariosDoGrupo(grupoId);
  }

  @Delete(':grupoId/:usuarioId')
  remover(
    @Param('grupoId') grupoId: string,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.service.removerUsuario(grupoId, usuarioId);
  }
}

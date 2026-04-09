import { Module } from '@nestjs/common';
import { GrupoUsuarioController } from './grupo-usuario.controller';
import { GrupoUsuarioService } from './grupo-usuario.service';

@Module({
  controllers: [GrupoUsuarioController],
  providers: [GrupoUsuarioService],
  exports: [GrupoUsuarioService],
})
export class GrupoUsuarioModule {}

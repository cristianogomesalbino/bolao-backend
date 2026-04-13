import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { USUARIOS } from './usuarios.constants';
import { PrismaUsuarioRepository } from './repositories/prisma-usuario.repository';

@Module({
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    { provide: USUARIOS.REPOSITORY_TOKEN, useClass: PrismaUsuarioRepository },
  ],
  exports: [UsuariosService, USUARIOS.REPOSITORY_TOKEN],
})
export class UsuariosModule {}

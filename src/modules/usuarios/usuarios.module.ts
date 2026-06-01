import { Module, forwardRef } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { USUARIOS } from './usuarios.constants';
import { PrismaUsuarioRepository } from './repositories/prisma-usuario.repository';
import { GrupoUsuarioModule } from '../grupo-usuario/grupo-usuario.module';

@Module({
  imports: [forwardRef(() => GrupoUsuarioModule)],
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    { provide: USUARIOS.REPOSITORY_TOKEN, useClass: PrismaUsuarioRepository },
  ],
  exports: [UsuariosService, USUARIOS.REPOSITORY_TOKEN],
})
export class UsuariosModule {}

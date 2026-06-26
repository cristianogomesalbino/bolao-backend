import { Module, forwardRef } from '@nestjs/common';
import { GrupoUsuarioController } from './grupo-usuario.controller';
import { GrupoUsuarioService } from './grupo-usuario.service';
import { GRUPO_USUARIO } from './grupo-usuario.constants';
import { PrismaGrupoUsuarioRepository } from './repositories/prisma-grupo-usuario.repository';
import { GruposModule } from '../grupos/grupos.module';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [forwardRef(() => GruposModule), forwardRef(() => UsuariosModule)],
  controllers: [GrupoUsuarioController],
  providers: [
    GrupoUsuarioService,
    {
      provide: GRUPO_USUARIO.REPOSITORY_TOKEN,
      useClass: PrismaGrupoUsuarioRepository,
    },
  ],
  exports: [GrupoUsuarioService, GRUPO_USUARIO.REPOSITORY_TOKEN],
})
export class GrupoUsuarioModule {}

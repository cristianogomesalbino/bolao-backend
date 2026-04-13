import { Module, forwardRef } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { GruposController } from './grupos.controller';
import { GrupoUsuarioModule } from '../grupo-usuario/grupo-usuario.module';
import { TemporadasModule } from '../temporadas/temporadas.module';
import { GRUPOS } from './grupos.constants';
import { PrismaGrupoRepository } from './repositories/prisma-grupo.repository';
import { GRUPO_USUARIO } from '../grupo-usuario/grupo-usuario.constants';
import { PrismaGrupoUsuarioRepository } from '../grupo-usuario/repositories/prisma-grupo-usuario.repository';

@Module({
  imports: [forwardRef(() => GrupoUsuarioModule), TemporadasModule],
  controllers: [GruposController],
  providers: [
    GruposService,
    { provide: GRUPOS.REPOSITORY_TOKEN, useClass: PrismaGrupoRepository },
    { provide: GRUPO_USUARIO.REPOSITORY_TOKEN, useClass: PrismaGrupoUsuarioRepository },
  ],
  exports: [GRUPOS.REPOSITORY_TOKEN],
})
export class GruposModule {}

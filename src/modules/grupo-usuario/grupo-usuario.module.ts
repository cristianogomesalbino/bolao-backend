import { Module } from '@nestjs/common';
import { GrupoUsuarioController } from './grupo-usuario.controller';
import { GrupoUsuarioService } from './grupo-usuario.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [GrupoUsuarioController],
  providers: [GrupoUsuarioService, PrismaService],
})
export class GrupoUsuarioModule {}

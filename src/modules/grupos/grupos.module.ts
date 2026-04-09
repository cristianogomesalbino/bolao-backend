import { Module } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { GruposController } from './grupos.controller';
import { GrupoUsuarioModule } from '../grupo-usuario/grupo-usuario.module';

@Module({
  imports: [GrupoUsuarioModule],
  controllers: [GruposController],
  providers: [GruposService],
})
export class GruposModule {}

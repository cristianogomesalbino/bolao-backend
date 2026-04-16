import { Module } from '@nestjs/common';
import { PalpiteController } from './palpite.controller';
import { PalpiteDobradoController } from './palpite-dobrado.controller';
import { PalpiteService } from './palpite.service';
import { PalpiteDobradoService } from './palpite-dobrado.service';
import { TokenDobroService } from './token-dobro.service';
import { PALPITES } from './palpites.constants';
import { PrismaPalpiteRepository } from './repositories/prisma-palpite.repository';
import { PrismaPalpiteDobradoRepository } from './repositories/prisma-palpite-dobrado.repository';
import { PrismaTokenDobroRepository } from './repositories/prisma-token-dobro.repository';
import { JogosModule } from '../jogos/jogos.module';
import { GruposModule } from '../grupos/grupos.module';
import { GrupoUsuarioModule } from '../grupo-usuario/grupo-usuario.module';

@Module({
  imports: [JogosModule, GruposModule, GrupoUsuarioModule],
  controllers: [PalpiteController, PalpiteDobradoController],
  providers: [
    PalpiteService,
    PalpiteDobradoService,
    TokenDobroService,
    {
      provide: PALPITES.PALPITE_REPOSITORY_TOKEN,
      useClass: PrismaPalpiteRepository,
    },
    {
      provide: PALPITES.PALPITE_DOBRADO_REPOSITORY_TOKEN,
      useClass: PrismaPalpiteDobradoRepository,
    },
    {
      provide: PALPITES.TOKEN_DOBRO_REPOSITORY_TOKEN,
      useClass: PrismaTokenDobroRepository,
    },
  ],
  exports: [
    PalpiteService,
    TokenDobroService,
    PALPITES.PALPITE_REPOSITORY_TOKEN,
    PALPITES.PALPITE_DOBRADO_REPOSITORY_TOKEN,
    PALPITES.TOKEN_DOBRO_REPOSITORY_TOKEN,
  ],
})
export class PalpitesModule {}

import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { CreateCampeonatoDto } from './modules/campeonatos/dto/create-campeonato.dto';

@Injectable()
export class CampeonatosService {
  constructor(private prisma: PrismaService) {}

  create(createCampeonatoDto: CreateCampeonatoDto) {
    return this.prisma.campeonato.create({
      data: {
        nome: createCampeonatoDto.nome,
      },
    });
  }

  findAll() {
    return this.prisma.campeonato.findMany();
  }
}

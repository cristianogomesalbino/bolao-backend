import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampeonatoDto } from './dto/create-campeonato.dto';

@Injectable()
export class CampeonatosService {
  constructor(private prisma: PrismaService) {}

  criar(createCampeonatoDto: CreateCampeonatoDto) {
    return this.prisma.campeonato.create({
      data: {
        nome: createCampeonatoDto.nome,
      },
    });
  }

  buscarTodos() {
    return this.prisma.campeonato.findMany();
  }
}

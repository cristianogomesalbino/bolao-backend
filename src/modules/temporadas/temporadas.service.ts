import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import { UpdateTemporadaDto } from './dto/update-temporada.dto';

@Injectable()
export class TemporadasService {
  constructor(private prisma: PrismaService) {}

  criar(createTemporadaDto: CreateTemporadaDto) {
    return this.prisma.temporada.create({
      data: {
        ano: createTemporadaDto.ano,
        campeonatoId: createTemporadaDto.campeonatoId,
      },
    });
  }
  
  buscarTodos() {
    return this.prisma.temporada.findMany({
      include: {
        campeonato: true,
      },
    });
  }
  
  buscarPorId(id: number) {
    return `This action returns a #${id} temporada`;
  }

  atualizar(id: number, updateTemporadaDto: UpdateTemporadaDto) {
    return `This action updates a #${id} temporada`;
  }

  remover(id: number) {
    return `This action removes a #${id} temporada`;
  }
}

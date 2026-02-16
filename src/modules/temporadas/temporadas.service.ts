import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import { UpdateTemporadaDto } from './dto/update-temporada.dto';

@Injectable()
export class TemporadasService {
  constructor(private prisma: PrismaService) {}

  create(createTemporadaDto: CreateTemporadaDto) {
    return this.prisma.temporada.create({
      data: {
        ano: createTemporadaDto.ano,
        campeonatoId: createTemporadaDto.campeonatoId,
      },
    });
  }
  
  findAll() {
    return this.prisma.temporada.findMany({
      include: {
        campeonato: true,
      },
    });
  }
  
  findOne(id: number) {
    return `This action returns a #${id} temporada`;
  }

  update(id: number, updateTemporadaDto: UpdateTemporadaDto) {
    return `This action updates a #${id} temporada`;
  }

  remove(id: number) {
    return `This action removes a #${id} temporada`;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemporadaDto } from './dto/create-temporada.dto';
import { ErrorFactory } from '../../common/errors/error.factory';

@Injectable()
export class TemporadasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(createTemporadaDto: CreateTemporadaDto) {
    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id: createTemporadaDto.campeonatoId },
    });

    if (!campeonato) {
      throw ErrorFactory.notFound('Campeonato não encontrado');
    }

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
}

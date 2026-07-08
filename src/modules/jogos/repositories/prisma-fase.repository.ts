import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FaseRepository } from './fase.repository.interface';

@Injectable()
export class PrismaFaseRepository implements FaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: any) {
    return this.prisma.fase.create({ data });
  }

  async criarVarios(data: any[]) {
    await this.prisma.fase.createMany({ data });
    return this.prisma.fase.findMany({
      where: { temporadaId: data[0]?.temporadaId },
      orderBy: { ordem: 'asc' },
    });
  }

  buscarPorId(id: string) {
    return this.prisma.fase.findUnique({
      where: { id },
      include: { temporada: { include: { campeonato: true } } },
    });
  }

  buscarPorTemporada(temporadaId: string) {
    return this.prisma.fase.findMany({
      where: { temporadaId },
      orderBy: { ordem: 'asc' },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FaseRepository } from './fase.repository.interface';

@Injectable()
export class PrismaFaseRepository implements FaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: any) {
    return this.prisma.fase.create({ data });
  }

  buscarPorId(id: string) {
    return this.prisma.fase.findUnique({ where: { id } });
  }

  buscarPorTemporada(temporadaId: string) {
    return this.prisma.fase.findMany({
      where: { temporadaId },
      orderBy: { ordem: 'asc' },
    });
  }
}

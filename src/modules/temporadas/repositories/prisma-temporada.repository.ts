import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TemporadaRepository } from './temporada.repository.interface';

@Injectable()
export class PrismaTemporadaRepository implements TemporadaRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: { ano: number; campeonatoId: string }) {
    return this.prisma.temporada.create({ data });
  }

  buscarTodos() {
    return this.prisma.temporada.findMany({ include: { campeonato: true } });
  }

  buscarPorId(id: string) {
    return this.prisma.temporada.findUnique({ where: { id } });
  }
}

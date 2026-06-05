import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  TemporadaRepository,
  Temporada,
  TemporadaComCampeonato,
  CriarTemporadaData,
} from './temporada.repository.interface';

@Injectable()
export class PrismaTemporadaRepository implements TemporadaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarTemporadaData): Promise<Temporada> {
    return this.prisma.temporada.create({ data });
  }

  async buscarTodos(): Promise<TemporadaComCampeonato[]> {
    return this.prisma.temporada.findMany({ include: { campeonato: true } });
  }

  async buscarPorId(id: string): Promise<Temporada | null> {
    return this.prisma.temporada.findUnique({ where: { id } });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CampeonatoRepository } from './campeonato.repository.interface';

@Injectable()
export class PrismaCampeonatoRepository implements CampeonatoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: { nome: string }) {
    return this.prisma.campeonato.create({ data });
  }

  buscarTodos() {
    return this.prisma.campeonato.findMany();
  }

  buscarPorId(id: string) {
    return this.prisma.campeonato.findUnique({ where: { id } });
  }
}

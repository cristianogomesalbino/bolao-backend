import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  CampeonatoRepository,
  StatusCampeonato,
} from './campeonato.repository.interface';

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

  atualizarStatus(id: string, status: StatusCampeonato) {
    return this.prisma.campeonato.update({
      where: { id },
      data: { status },
    });
  }
}

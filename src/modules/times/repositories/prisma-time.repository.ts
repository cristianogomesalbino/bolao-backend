import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TimeRepository } from './time.repository.interface';

@Injectable()
export class PrismaTimeRepository implements TimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: any) {
    return this.prisma.time.create({ data });
  }

  buscarPorExternoId(externoId: string) {
    return this.prisma.time.findUnique({ where: { externoId } });
  }

  buscarPorId(id: string) {
    return this.prisma.time.findUnique({ where: { id } });
  }

  buscarPorSigla(sigla: string) {
    return this.prisma.time.findUnique({ where: { sigla } });
  }

  buscarTodos() {
    return this.prisma.time.findMany({ orderBy: { nome: 'asc' } });
  }

  buscarPorExternoIds(externoIds: string[]) {
    return this.prisma.time.findMany({
      where: { externoId: { in: externoIds } },
    });
  }
}

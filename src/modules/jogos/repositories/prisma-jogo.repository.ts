import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JogoRepository } from './jogo.repository.interface';

@Injectable()
export class PrismaJogoRepository implements JogoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: any) {
    return this.prisma.jogo.create({ data });
  }

  atualizar(id: string, data: any) {
    return this.prisma.jogo.update({ where: { id }, data });
  }

  buscarPorId(id: string) {
    return this.prisma.jogo.findUnique({ where: { id }, include: { fase: true } });
  }

  buscarPorFase(faseId: string, rodada?: number) {
    const where: any = { faseId };
    if (rodada !== undefined) where.rodada = rodada;
    return this.prisma.jogo.findMany({
      where,
      orderBy: { dataHora: 'asc' },
    });
  }

  buscarPorExternoId(externoId: string) {
    return this.prisma.jogo.findUnique({ where: { externoId } });
  }

  buscarPorGrupoIdaVolta(grupoIdaVolta: string) {
    return this.prisma.jogo.findMany({ where: { grupoIdaVolta } });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GrupoRepository } from './grupo.repository.interface';

const includeGrupo = {
  temporada: {
    include: {
      campeonato: true,
    },
  },
};

@Injectable()
export class PrismaGrupoRepository implements GrupoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: {
    nome: string;
    temporadaId: string;
    privado: boolean;
    codigoConvite: string | null;
    permitirPalpiteAutomatico: boolean;
    maxParticipantes: number;
    createdById: string;
  }) {
    return this.prisma.grupo.create({ data, include: includeGrupo });
  }

  buscarTodos(filtros: { ativo: boolean }) {
    return this.prisma.grupo.findMany({
      where: { ativo: filtros.ativo },
      include: includeGrupo,
    });
  }

  buscarPorId(id: string) {
    return this.prisma.grupo.findUnique({
      where: { id },
      include: includeGrupo,
    });
  }

  buscarPorIdSimples(id: string) {
    return this.prisma.grupo.findUnique({ where: { id } });
  }

  buscarPorCodigoConvite(codigo: string) {
    return this.prisma.grupo.findUnique({ where: { codigoConvite: codigo } });
  }

  atualizar(id: string, data: Partial<{ nome: string; privado: boolean; permitirPalpiteAutomatico: boolean; ativo: boolean }>) {
    return this.prisma.grupo.update({ where: { id }, data });
  }

  async remover(id: string) {
    await this.prisma.grupo.delete({ where: { id } });
  }
}

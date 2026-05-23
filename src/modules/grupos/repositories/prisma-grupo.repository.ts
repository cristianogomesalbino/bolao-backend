import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GrupoRepository, FiltrosGrupo } from './grupo.repository.interface';

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
    permitirPalpiteDobrado: boolean;
    criadoPor: string;
  }) {
    return this.prisma.grupo.create({ data, include: includeGrupo });
  }

  buscarTodos(filtros: { ativo: boolean }) {
    return this.prisma.grupo.findMany({
      where: { ativo: filtros.ativo },
      include: includeGrupo,
    });
  }

  buscarComFiltros(filtros: FiltrosGrupo) {
    const where: any = { ativo: filtros.ativo };

    if (filtros.membro && filtros.usuarioId) {
      where.usuarios = {
        some: { usuarioId: filtros.usuarioId },
      };
    }

    if (filtros.privado !== undefined) {
      where.privado = filtros.privado;
    }

    if (filtros.busca) {
      where.nome = {
        contains: filtros.busca,
        mode: 'insensitive',
      };
    }

    return this.prisma.grupo.findMany({
      where,
      include: {
        ...includeGrupo,
        _count: { select: { usuarios: true } },
      },
    });
  }

  buscarPorId(id: string) {
    return this.prisma.grupo.findUnique({
      where: { id },
      include: {
        ...includeGrupo,
        _count: { select: { usuarios: true } },
      },
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

  buscarPorTemporadaId(temporadaId: string) {
    return this.prisma.grupo.findMany({
      where: { temporadaId },
    });
  }
}

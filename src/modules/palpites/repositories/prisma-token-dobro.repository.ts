import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenDobroRepository } from './token-dobro.repository.interface';

@Injectable()
export class PrismaTokenDobroRepository implements TokenDobroRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(data: {
    usuarioId: string;
    grupoId: string;
    tipo: 'CONCESSAO' | 'UTILIZACAO';
    motivo: 'PALPITES_COMPLETOS' | 'ACERTO_EM_CHEIO' | 'ULTIMO_RANKING' | 'PRIMEIRO_RANKING' | 'ATIVACAO_DOBRO' | 'CANCELAMENTO_DOBRO';
    referenciaId: string;
  }) {
    return this.prisma.tokenDobro.create({ data });
  }

  async calcularSaldo(usuarioId: string, grupoId: string): Promise<number> {
    const tokens = await this.prisma.tokenDobro.groupBy({
      by: ['tipo'],
      where: { usuarioId, grupoId },
      _count: true,
    });
    const concessoes = tokens.find((t) => t.tipo === 'CONCESSAO')?._count ?? 0;
    const utilizacoes = tokens.find((t) => t.tipo === 'UTILIZACAO')?._count ?? 0;
    return concessoes - utilizacoes;
  }

  listarPorUsuarioEGrupo(usuarioId: string, grupoId: string) {
    return this.prisma.tokenDobro.findMany({
      where: { usuarioId, grupoId },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  buscarPorChave(usuarioId: string, grupoId: string, motivo: string, referenciaId: string) {
    return this.prisma.tokenDobro.findFirst({
      where: { usuarioId, grupoId, motivo: motivo as any, referenciaId },
    });
  }
}

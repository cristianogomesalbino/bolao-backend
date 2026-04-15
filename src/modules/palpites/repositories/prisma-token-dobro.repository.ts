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
    const [result] = await this.prisma.$queryRaw<[{ saldo: bigint }]>`
      SELECT
        COALESCE(
          COUNT(*) FILTER (WHERE tipo = 'CONCESSAO') -
          COUNT(*) FILTER (WHERE tipo = 'UTILIZACAO'),
          0
        ) AS saldo
      FROM "TokenDobro"
      WHERE "usuarioId" = ${usuarioId} AND "grupoId" = ${grupoId}
    `;
    return Number(result.saldo);
  }

  listarPorUsuarioEGrupo(usuarioId: string, grupoId: string) {
    return this.prisma.tokenDobro.findMany({
      where: { usuarioId, grupoId },
      orderBy: { dataCriacao: 'desc' },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  NotificacaoRepository,
  CriarNotificacaoData,
  ListarFiltros,
  DeduplicacaoFiltro,
  Notificacao,
} from './notificacao.repository.interface';

@Injectable()
export class PrismaNotificacaoRepository implements NotificacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarNotificacaoData): Promise<Notificacao> {
    return this.prisma.notificacao.create({ data: data as any }) as Promise<Notificacao>;
  }

  async criarVarios(data: CriarNotificacaoData[]): Promise<void> {
    if (data.length === 0) return;
    await this.prisma.notificacao.createMany({ data: data as any });
  }

  async buscarPorId(id: string): Promise<Notificacao | null> {
    return this.prisma.notificacao.findUnique({
      where: { id },
    }) as Promise<Notificacao | null>;
  }

  async listar(
    usuarioId: string,
    filtros: ListarFiltros,
  ): Promise<Notificacao[]> {
    const where: Record<string, unknown> = { usuarioId };
    if (filtros.status) {
      where.status = filtros.status;
    }

    return this.prisma.notificacao.findMany({
      where,
      orderBy: { dataCriacao: 'desc' },
      take: filtros.limit,
      skip: filtros.offset,
    }) as Promise<Notificacao[]>;
  }

  async contarPorFiltro(
    usuarioId: string,
    filtros: ListarFiltros,
  ): Promise<number> {
    const where: Record<string, unknown> = { usuarioId };
    if (filtros.status) {
      where.status = filtros.status;
    }

    return this.prisma.notificacao.count({ where });
  }

  async contarNaoLidas(usuarioId: string): Promise<number> {
    return this.prisma.notificacao.count({
      where: { usuarioId, status: 'NAO_LIDA' },
    });
  }

  async marcarComoLida(id: string, dataLeitura: Date): Promise<void> {
    await this.prisma.notificacao.update({
      where: { id },
      data: { status: 'LIDA', dataLeitura },
    });
  }

  async marcarTodasComoLidas(
    usuarioId: string,
    dataLeitura: Date,
  ): Promise<number> {
    const result = await this.prisma.notificacao.updateMany({
      where: { usuarioId, status: 'NAO_LIDA' },
      data: { status: 'LIDA', dataLeitura },
    });
    return result.count;
  }

  async existeNotificacao(filtro: DeduplicacaoFiltro): Promise<boolean> {
    const where: Record<string, unknown> = { tipo: filtro.tipo };
    if (filtro.jogoId) where.jogoId = filtro.jogoId;
    if (filtro.faseId) where.faseId = filtro.faseId;
    if (filtro.rodada != null) where.rodada = filtro.rodada;
    if (filtro.grupoId) where.grupoId = filtro.grupoId;
    if (filtro.usuarioId) where.usuarioId = filtro.usuarioId;

    const count = await this.prisma.notificacao.count({ where, take: 1 });
    return count > 0;
  }

  async removerAntigasLidas(
    diasLimite: number,
    batchSize: number,
  ): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    const result = await this.prisma.notificacao.deleteMany({
      where: {
        status: 'LIDA',
        dataLeitura: { lt: dataLimite },
      },
      // Prisma deleteMany não suporta limit — processamos em batch externamente se necessário
    });
    return Math.min(result.count, batchSize);
  }

  async removerAntigasNaoLidas(
    diasLimite: number,
    batchSize: number,
  ): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    const result = await this.prisma.notificacao.deleteMany({
      where: {
        status: 'NAO_LIDA',
        dataCriacao: { lt: dataLimite },
      },
    });
    return Math.min(result.count, batchSize);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  LogSincronizacaoRepository,
  LogSincronizacao,
  CriarLogSincronizacaoData,
} from './log-sincronizacao.repository.interface';

@Injectable()
export class PrismaLogSincronizacaoRepository implements LogSincronizacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarLogSincronizacaoData): Promise<LogSincronizacao> {
    return this.prisma.logSincronizacao.create({
      data: {
        campeonatoSlug: data.campeonatoSlug,
        fasesIds: data.fasesIds,
        totalJogos: data.totalJogos,
        sincronizados: data.sincronizados,
        erros: data.erros ?? 0,
        status: data.status as any,
        mensagem: data.mensagem ?? null,
        duracaoMs: data.duracaoMs,
        detalhes: data.detalhes ?? null,
      },
    }) as unknown as LogSincronizacao;
  }

  async buscarRecentes(limite = 20): Promise<LogSincronizacao[]> {
    return this.prisma.logSincronizacao.findMany({
      orderBy: { dataCriacao: 'desc' },
      take: limite,
    }) as unknown as LogSincronizacao[];
  }

  async buscarPorCampeonato(
    campeonatoSlug: string,
    limite = 10,
  ): Promise<LogSincronizacao[]> {
    return this.prisma.logSincronizacao.findMany({
      where: { campeonatoSlug },
      orderBy: { dataCriacao: 'desc' },
      take: limite,
    }) as unknown as LogSincronizacao[];
  }

  async buscarUltimaSincronizacao(
    campeonatoSlug: string,
  ): Promise<LogSincronizacao | null> {
    return this.prisma.logSincronizacao.findFirst({
      where: { campeonatoSlug },
      orderBy: { dataCriacao: 'desc' },
    }) as unknown as LogSincronizacao | null;
  }
}

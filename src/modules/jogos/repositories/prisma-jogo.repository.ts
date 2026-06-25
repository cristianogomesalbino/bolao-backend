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
    return this.prisma.jogo.findUnique({
      where: { id },
      include: { fase: true, timeCasa: true, timeFora: true },
    });
  }

  buscarPorIds(ids: string[]) {
    return this.prisma.jogo.findMany({ where: { id: { in: ids } } });
  }

  buscarPorExternoIds(externoIds: string[]) {
    return this.prisma.jogo.findMany({
      where: { externoId: { in: externoIds } },
      select: { externoId: true },
    });
  }

  buscarPorFase(faseId: string, rodada?: number) {
    const where: any = { faseId };
    if (rodada !== undefined) where.rodada = rodada;
    return this.prisma.jogo.findMany({
      where,
      include: { timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });
  }

  buscarPorFaseAteRodada(faseId: string, ateRodada: number) {
    return this.prisma.jogo.findMany({
      where: { faseId, rodada: { lte: ateRodada } },
      include: { timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });
  }

  buscarPorFaseEStatus(faseId: string, status: string) {
    return this.prisma.jogo.findMany({
      where: { faseId, status: status as any },
      include: { timeCasa: true, timeFora: true },
      orderBy: [{ rodada: 'asc' }, { dataHora: 'asc' }],
    });
  }

  buscarPorExternoId(externoId: string) {
    return this.prisma.jogo.findUnique({ where: { externoId } });
  }

  buscarPorGrupoIdaVolta(grupoIdaVolta: string) {
    return this.prisma.jogo.findMany({ where: { grupoIdaVolta } });
  }

  async buscarProximoJogoPorTemporada(temporadaId: string) {
    // Prioridade 1: jogos em andamento
    const emAndamento = await this.prisma.jogo.findFirst({
      where: {
        fase: { temporadaId },
        status: 'EM_ANDAMENTO',
      },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });

    if (emAndamento) return emAndamento;

    // Prioridade 2: próximo agendado
    return this.prisma.jogo.findFirst({
      where: {
        fase: { temporadaId },
        status: 'AGENDADO',
        dataHora: { gt: new Date() },
      },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });
  }

  async buscarProximosJogosPorTemporada(temporadaId: string) {
    // Prioridade 1: jogos em andamento agora
    const emAndamento = await this.prisma.jogo.findMany({
      where: {
        fase: { temporadaId },
        status: 'EM_ANDAMENTO',
      },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });

    if (emAndamento.length > 0) return emAndamento;

    // Prioridade 2: próximos jogos agendados (mesmo horário)
    const primeiro = await this.prisma.jogo.findFirst({
      where: {
        fase: { temporadaId },
        status: 'AGENDADO',
        dataHora: { gt: new Date() },
      },
      orderBy: { dataHora: 'asc' },
      select: { dataHora: true },
    });

    if (!primeiro?.dataHora) return [];

    return this.prisma.jogo.findMany({
      where: {
        fase: { temporadaId },
        status: 'AGENDADO',
        dataHora: primeiro.dataHora,
      },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });
  }

  contarAdiadosPorTemporada(temporadaId: string) {
    return this.prisma.jogo.count({
      where: {
        fase: { temporadaId },
        status: 'ADIADO',
      },
    });
  }

  buscarTodosPorTemporada(temporadaId: string) {
    return this.prisma.jogo.findMany({
      where: { fase: { temporadaId } },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: [
        { fase: { ordem: 'asc' } },
        { rodada: 'asc' },
        { dataHora: 'asc' },
      ],
    });
  }

  async buscarRodadaAtual(faseId: string): Promise<number | null> {
    // Menor rodada com pelo menos 1 jogo ativo (não finalizado, não adiado, com data definida)
    const jogo = await this.prisma.jogo.findFirst({
      where: {
        faseId,
        status: { notIn: ['FINALIZADO', 'ADIADO', 'CANCELADO'] },
        rodada: { not: null },
        dataHora: { not: null },
      },
      orderBy: { rodada: 'asc' },
      select: { rodada: true },
    });
    if (jogo?.rodada) return jogo.rodada;

    // Todas finalizadas → retornar a última rodada
    const ultimo = await this.prisma.jogo.findFirst({
      where: { faseId, rodada: { not: null } },
      orderBy: { rodada: 'desc' },
      select: { rodada: true },
    });
    return ultimo?.rodada ?? null;
  }

  buscarPendentesSync(faseIds: string[], limiteRodada: number) {
    return this.prisma.jogo.findMany({
      where: {
        faseId: { in: faseIds },
        fonteResultado: 'API_EXTERNA',
        status: { notIn: ['FINALIZADO', 'CANCELADO'] },
        OR: [{ rodada: null }, { rodada: { lte: limiteRodada } }],
      },
      include: { timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });
  }

  buscarJogosComTimePlaceholder(
    temporadaId: string,
    placeholderTimeId: string,
  ) {
    return this.prisma.jogo.findMany({
      where: {
        fase: { temporadaId },
        OR: [
          { timeCasaId: placeholderTimeId },
          { timeForaId: placeholderTimeId },
        ],
      },
      include: { timeCasa: true, timeFora: true, fase: true },
      orderBy: [{ fase: { ordem: 'asc' } }, { rodada: 'asc' }],
    });
  }
}

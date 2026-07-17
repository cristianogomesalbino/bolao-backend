import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  Jogo,
  JogoComTimes,
  JogoComRelacoes,
  JogoExternoId,
  CriarJogoData,
  AtualizarJogoData,
  JogoRepository,
} from './jogo.repository.interface';

@Injectable()
export class PrismaJogoRepository implements JogoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarJogoData): Promise<Jogo> {
    return this.prisma.jogo.create({
      data: data as Parameters<typeof this.prisma.jogo.create>[0]['data'],
    }) as unknown as Promise<Jogo>;
  }

  async atualizar(id: string, data: AtualizarJogoData): Promise<Jogo> {
    return this.prisma.jogo.update({
      where: { id },
      data: data as Parameters<typeof this.prisma.jogo.update>[0]['data'],
    }) as unknown as Promise<Jogo>;
  }

  async buscarPorId(id: string): Promise<JogoComRelacoes | null> {
    return this.prisma.jogo.findUnique({
      where: { id },
      include: { fase: true, timeCasa: true, timeFora: true },
    }) as unknown as Promise<JogoComRelacoes | null>;
  }

  async buscarPorIds(ids: string[]): Promise<Jogo[]> {
    return this.prisma.jogo.findMany({
      where: { id: { in: ids } },
    }) as unknown as Promise<Jogo[]>;
  }

  async buscarPorExternoIds(externoIds: string[]): Promise<JogoExternoId[]> {
    return this.prisma.jogo.findMany({
      where: { externoId: { in: externoIds } },
      select: { externoId: true },
    }) as unknown as Promise<JogoExternoId[]>;
  }

  async buscarPorFase(faseId: string, rodada?: number): Promise<JogoComTimes[]> {
    const where: Record<string, unknown> = { faseId };
    if (rodada !== undefined) where.rodada = rodada;
    return this.prisma.jogo.findMany({
      where,
      include: { timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    }) as unknown as Promise<JogoComTimes[]>;
  }

  async buscarPorFaseAteRodada(
    faseId: string,
    ateRodada: number,
  ): Promise<JogoComTimes[]> {
    return this.prisma.jogo.findMany({
      where: { faseId, rodada: { lte: ateRodada } },
      include: { timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    }) as unknown as Promise<JogoComTimes[]>;
  }

  async buscarPorFaseEStatus(faseId: string, status: string): Promise<JogoComTimes[]> {
    return this.prisma.jogo.findMany({
      where: { faseId, status: status as Parameters<typeof this.prisma.jogo.findMany>[0] extends { where?: infer W } ? W extends { status?: infer S } ? S : never : never },
      include: { timeCasa: true, timeFora: true },
      orderBy: [{ rodada: 'asc' }, { dataHora: 'asc' }],
    }) as unknown as Promise<JogoComTimes[]>;
  }

  async buscarPorExternoId(externoId: string): Promise<Jogo | null> {
    return this.prisma.jogo.findUnique({
      where: { externoId },
    }) as unknown as Promise<Jogo | null>;
  }

  async buscarPorGrupoIdaVolta(grupoIdaVolta: string): Promise<Jogo[]> {
    return this.prisma.jogo.findMany({
      where: { grupoIdaVolta },
    }) as unknown as Promise<Jogo[]>;
  }

  async buscarProximoJogoPorTemporada(
    temporadaId: string,
  ): Promise<JogoComRelacoes | null> {
    const emAndamento = await this.prisma.jogo.findFirst({
      where: {
        fase: { temporadaId },
        status: 'EM_ANDAMENTO',
      },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });

    if (emAndamento) return emAndamento as unknown as JogoComRelacoes;

    return this.prisma.jogo.findFirst({
      where: {
        fase: { temporadaId },
        status: 'AGENDADO',
        dataHora: { gt: new Date() },
      },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    }) as unknown as Promise<JogoComRelacoes | null>;
  }

  async buscarProximosJogosPorTemporada(
    temporadaId: string,
  ): Promise<JogoComRelacoes[]> {
    const emAndamento = await this.prisma.jogo.findMany({
      where: {
        fase: { temporadaId },
        status: 'EM_ANDAMENTO',
      },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    });

    if (emAndamento.length > 0) return emAndamento as unknown as JogoComRelacoes[];

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
    }) as unknown as Promise<JogoComRelacoes[]>;
  }

  async contarAdiadosPorTemporada(temporadaId: string): Promise<number> {
    return this.prisma.jogo.count({
      where: {
        fase: { temporadaId },
        status: 'ADIADO',
      },
    });
  }

  async buscarTodosPorTemporada(temporadaId: string): Promise<JogoComRelacoes[]> {
    return this.prisma.jogo.findMany({
      where: { fase: { temporadaId } },
      include: { fase: true, timeCasa: true, timeFora: true },
      orderBy: [
        { fase: { ordem: 'asc' } },
        { rodada: 'asc' },
        { dataHora: 'asc' },
      ],
    }) as unknown as Promise<JogoComRelacoes[]>;
  }

  async buscarRodadaAtual(faseId: string): Promise<number | null> {
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

    const ultimo = await this.prisma.jogo.findFirst({
      where: { faseId, rodada: { not: null } },
      orderBy: { rodada: 'desc' },
      select: { rodada: true },
    });
    return ultimo?.rodada ?? null;
  }

  async buscarPendentesSync(
    faseIds: string[],
    limiteRodada: number,
  ): Promise<JogoComTimes[]> {
    return this.prisma.jogo.findMany({
      where: {
        faseId: { in: faseIds },
        fonteResultado: 'API_EXTERNA',
        status: { notIn: ['FINALIZADO', 'CANCELADO'] },
        OR: [
          { rodada: null },
          { rodada: { lte: limiteRodada } },
          // Incluir jogos atrasados (dataHora já passou) independente da rodada
          { dataHora: { not: null, lte: new Date() } },
        ],
      },
      include: { timeCasa: true, timeFora: true },
      orderBy: { dataHora: 'asc' },
    }) as unknown as Promise<JogoComTimes[]>;
  }

  async buscarJogosComTimePlaceholder(
    temporadaId: string,
    placeholderTimeId: string,
  ): Promise<JogoComRelacoes[]> {
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
    }) as unknown as Promise<JogoComRelacoes[]>;
  }

  async buscarAgendadosEntre(inicio: Date, fim: Date): Promise<JogoComRelacoes[]> {
    return this.prisma.jogo.findMany({
      where: {
        status: 'AGENDADO',
        dataHora: { gte: inicio, lte: fim },
      },
      include: { timeCasa: true, timeFora: true, fase: true },
      orderBy: { dataHora: 'asc' },
    }) as unknown as Promise<JogoComRelacoes[]>;
  }

  async contarAtrasados(): Promise<number> {
    return this.prisma.jogo.count({
      where: {
        status: 'AGENDADO',
        fonteResultado: 'API_EXTERNA',
        dataHora: { not: null, lte: new Date() },
      },
    });
  }

  async contarEmAndamento(): Promise<number> {
    return this.prisma.jogo.count({
      where: {
        status: 'EM_ANDAMENTO',
        fonteResultado: 'API_EXTERNA',
      },
    });
  }

  async buscarProximoAgendado(): Promise<{
    dataHora: Date | null;
    timeCasa?: { sigla: string } | null;
    timeFora?: { sigla: string } | null;
  } | null> {
    return this.prisma.jogo.findFirst({
      where: {
        status: 'AGENDADO',
        fonteResultado: 'API_EXTERNA',
        dataHora: { gt: new Date() },
      },
      orderBy: { dataHora: 'asc' },
      select: {
        dataHora: true,
        timeCasa: { select: { sigla: true } },
        timeFora: { select: { sigla: true } },
      },
    });
  }
}

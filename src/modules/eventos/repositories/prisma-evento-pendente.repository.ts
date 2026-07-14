import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { EVENTOS } from '../eventos.constants';
import type {
  EventoPendenteRepository,
  EventoPendente,
  CriarEventoPendenteData,
  ContagemEventos,
} from './evento-pendente.repository.interface';

@Injectable()
export class PrismaEventoPendenteRepository implements EventoPendenteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarEventoPendenteData): Promise<EventoPendente | null> {
    try {
      const evento = await this.prisma.eventoPendente.create({
        data: {
          tipo: data.tipo,
          chaveIdempotencia: data.chaveIdempotencia,
          payload: data.payload as Prisma.InputJsonValue,
          syncId: data.syncId ?? null,
        },
      });
      return this.mapear(evento);
    } catch (error: unknown) {
      // Constraint UNIQUE violada — evento já existe (idempotente)
      if (this.ehErroUniqueConstraint(error)) {
        return null;
      }
      throw error;
    }
  }

  async buscarPendentes(limite = 50): Promise<EventoPendente[]> {
    const eventos = await this.prisma.eventoPendente.findMany({
      where: { status: EVENTOS.STATUS.PENDENTE },
      orderBy: { dataCriacao: 'asc' },
      take: limite,
    });
    return eventos.map((e) => this.mapear(e));
  }

  async marcarProcessando(id: string): Promise<void> {
    await this.prisma.eventoPendente.update({
      where: { id },
      data: { status: EVENTOS.STATUS.PROCESSANDO },
    });
  }

  async marcarProcessado(id: string): Promise<void> {
    await this.prisma.eventoPendente.update({
      where: { id },
      data: {
        status: EVENTOS.STATUS.PROCESSADO,
        processadoEm: new Date(),
      },
    });
  }

  async marcarFalha(
    id: string,
    erro: string,
    maxTentativas: number,
  ): Promise<void> {
    const evento = await this.prisma.eventoPendente.findUnique({
      where: { id },
      select: { tentativas: true },
    });

    const novasTentativas = (evento?.tentativas ?? 0) + 1;
    const novoStatus =
      novasTentativas >= maxTentativas
        ? EVENTOS.STATUS.FALHA_DEFINITIVA
        : EVENTOS.STATUS.PENDENTE;

    await this.prisma.eventoPendente.update({
      where: { id },
      data: {
        tentativas: novasTentativas,
        ultimoErro: erro.slice(0, 500),
        status: novoStatus,
      },
    });
  }

  async contarPendentes(): Promise<ContagemEventos> {
    const [pendentes, falhas] = await Promise.all([
      this.prisma.eventoPendente.count({
        where: { status: EVENTOS.STATUS.PENDENTE },
      }),
      this.prisma.eventoPendente.count({
        where: { status: EVENTOS.STATUS.FALHA_DEFINITIVA },
      }),
    ]);
    return { pendentes, falhas };
  }

  private mapear(evento: {
    id: string;
    tipo: string;
    chaveIdempotencia: string;
    payload: unknown;
    status: string;
    tentativas: number;
    ultimoErro: string | null;
    syncId: string | null;
    dataCriacao: Date;
    processadoEm: Date | null;
  }): EventoPendente {
    return {
      id: evento.id,
      tipo: evento.tipo,
      chaveIdempotencia: evento.chaveIdempotencia,
      payload: evento.payload as Record<string, unknown>,
      status: evento.status as EventoPendente['status'],
      tentativas: evento.tentativas,
      ultimoErro: evento.ultimoErro,
      syncId: evento.syncId,
      dataCriacao: evento.dataCriacao,
      processadoEm: evento.processadoEm,
    };
  }

  private ehErroUniqueConstraint(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}

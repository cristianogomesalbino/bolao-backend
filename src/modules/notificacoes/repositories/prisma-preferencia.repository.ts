import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  PreferenciaRepository,
  PreferenciaCampos,
  PreferenciaNotificacao,
} from './preferencia.repository.interface';

@Injectable()
export class PrismaPreferenciaRepository implements PreferenciaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorUsuario(
    usuarioId: string,
  ): Promise<PreferenciaNotificacao | null> {
    return this.prisma.preferenciaNotificacao.findUnique({
      where: { usuarioId },
    }) as Promise<PreferenciaNotificacao | null>;
  }

  async criar(
    usuarioId: string,
    data?: Partial<PreferenciaCampos>,
  ): Promise<PreferenciaNotificacao> {
    return this.prisma.preferenciaNotificacao.create({
      data: { usuarioId, ...data },
    }) as Promise<PreferenciaNotificacao>;
  }

  async atualizar(
    usuarioId: string,
    data: Partial<PreferenciaCampos>,
  ): Promise<PreferenciaNotificacao> {
    return this.prisma.preferenciaNotificacao.upsert({
      where: { usuarioId },
      update: data,
      create: { usuarioId, ...data },
    }) as Promise<PreferenciaNotificacao>;
  }

  async buscarPorUsuarios(
    usuarioIds: string[],
  ): Promise<PreferenciaNotificacao[]> {
    if (usuarioIds.length === 0) return [];
    return this.prisma.preferenciaNotificacao.findMany({
      where: { usuarioId: { in: usuarioIds } },
    }) as Promise<PreferenciaNotificacao[]>;
  }
}

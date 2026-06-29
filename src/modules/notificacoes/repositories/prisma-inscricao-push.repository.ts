import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  InscricaoPushRepository,
  CriarInscricaoData,
  AtualizarInscricaoData,
  InscricaoPush,
} from './inscricao-push.repository.interface';

@Injectable()
export class PrismaInscricaoPushRepository implements InscricaoPushRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarInscricaoData): Promise<InscricaoPush> {
    return this.prisma.inscricaoPush.create({
      data,
    }) as Promise<InscricaoPush>;
  }

  async atualizar(
    usuarioId: string,
    endpoint: string,
    data: AtualizarInscricaoData,
  ): Promise<InscricaoPush> {
    return this.prisma.inscricaoPush.update({
      where: { usuarioId_endpoint: { usuarioId, endpoint } },
      data,
    }) as Promise<InscricaoPush>;
  }

  async remover(usuarioId: string, endpoint: string): Promise<void> {
    await this.prisma.inscricaoPush.delete({
      where: { usuarioId_endpoint: { usuarioId, endpoint } },
    });
  }

  async removerPorId(id: string): Promise<void> {
    await this.prisma.inscricaoPush.delete({ where: { id } });
  }

  async buscarPorUsuario(usuarioId: string): Promise<InscricaoPush[]> {
    return this.prisma.inscricaoPush.findMany({
      where: { usuarioId },
    }) as Promise<InscricaoPush[]>;
  }

  async buscarPorEndpoint(
    usuarioId: string,
    endpoint: string,
  ): Promise<InscricaoPush | null> {
    return this.prisma.inscricaoPush.findUnique({
      where: { usuarioId_endpoint: { usuarioId, endpoint } },
    }) as Promise<InscricaoPush | null>;
  }

  async contarPorUsuario(usuarioId: string): Promise<number> {
    return this.prisma.inscricaoPush.count({ where: { usuarioId } });
  }
}

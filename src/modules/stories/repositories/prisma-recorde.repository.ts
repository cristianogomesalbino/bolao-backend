import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  RecordeRepository,
  RecordeSequencia,
} from './recorde.repository.interface';
import type { CategoriaRecorde } from '../types/story.types';

@Injectable()
export class PrismaRecordeRepository implements RecordeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarRecorde(
    grupoId: string,
    temporadaId: string,
    categoria: CategoriaRecorde,
  ): Promise<RecordeSequencia | null> {
    const recorde = await this.prisma.recordeSequencia.findUnique({
      where: {
        grupoId_temporadaId_categoria: { grupoId, temporadaId, categoria },
      },
      include: { detentores: true },
    });
    return recorde as RecordeSequencia | null;
  }

  async criar(
    grupoId: string,
    temporadaId: string,
    categoria: CategoriaRecorde,
    valor: number,
    usuarioId: string,
  ): Promise<RecordeSequencia> {
    const recorde = await this.prisma.recordeSequencia.create({
      data: {
        grupoId,
        temporadaId,
        categoria,
        valor,
        detentores: {
          create: { usuarioId },
        },
      },
      include: { detentores: true },
    });
    return recorde as RecordeSequencia;
  }

  async atualizarValor(recordeId: string, novoValor: number): Promise<void> {
    await this.prisma.recordeSequencia.update({
      where: { id: recordeId },
      data: { valor: novoValor },
    });
  }

  async adicionarDetentor(recordeId: string, usuarioId: string): Promise<void> {
    await this.prisma.recordeDetentor.upsert({
      where: { recordeId_usuarioId: { recordeId, usuarioId } },
      create: { recordeId, usuarioId },
      update: {},
    });
  }

  async limparDetentores(recordeId: string): Promise<void> {
    await this.prisma.recordeDetentor.deleteMany({
      where: { recordeId },
    });
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { STORIES } from '../stories.constants';
import type {
  StoryRepository,
  CriarStoryData,
  CriarReacaoData,
  CriarVisualizacaoData,
  Story,
  StoryComAutor,
  StoryReacao,
} from './story.repository.interface';
import type { TipoStory } from '../types/story.types';

@Injectable()
export class PrismaStoryRepository implements StoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarStoryData): Promise<Story> {
    const story = await this.prisma.story.create({
      data: {
        ...data,
        dados: data.dados as unknown as Prisma.InputJsonValue,
      },
    });
    return this.mapear(story);
  }

  async criarVarios(data: CriarStoryData[]): Promise<void> {
    if (data.length === 0) return;
    await this.prisma.story.createMany({
      data: data.map((d) => ({
        ...d,
        dados: d.dados as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  async buscarPorId(id: string): Promise<Story | null> {
    const story = await this.prisma.story.findUnique({ where: { id } });
    return story ? this.mapear(story) : null;
  }

  async buscarPorGrupoERodadas(
    grupoId: string,
    rodadas: number[],
    limite: number,
  ): Promise<StoryComAutor[]> {
    if (rodadas.length === 0) return [];

    const stories = await this.prisma.story.findMany({
      where: {
        grupoId,
        rodada: { in: rodadas },
      },
      include: {
        usuario: { select: { id: true, nome: true } },
      },
      orderBy: [{ rodada: 'desc' }, { criadoEm: 'desc' }],
      take: limite,
    });

    // Re-ordena em memória para aplicar prioridade por tipo (não possível no SQL)
    const prioridades = STORIES.PRIORIDADE_POR_TIPO;
    return stories
      .sort((a, b) => {
        if (a.rodada !== b.rodada) return (b.rodada ?? 0) - (a.rodada ?? 0);
        const dateDiff = b.criadoEm.getTime() - a.criadoEm.getTime();
        if (dateDiff !== 0) return dateDiff;
        const prioA = prioridades[a.tipo] ?? 99;
        const prioB = prioridades[b.tipo] ?? 99;
        return prioA - prioB;
      })
      .map((s) => ({
        ...this.mapear(s),
        usuario: s.usuario,
      }));
  }

  async contarPorGrupoERodadas(
    grupoId: string,
    rodadas: number[],
  ): Promise<number> {
    if (rodadas.length === 0) return 0;
    return this.prisma.story.count({
      where: { grupoId, rodada: { in: rodadas } },
    });
  }

  async incrementarContadorFs(storyId: string): Promise<number> {
    const updated = await this.prisma.story.update({
      where: { id: storyId },
      data: { contadorFs: { increment: 1 } },
    });
    return updated.contadorFs;
  }

  async existeReacao(remetenteId: string, storyId: string): Promise<boolean> {
    const reacao = await this.prisma.storyReacao.findUnique({
      where: { remetenteId_storyId: { remetenteId, storyId } },
    });
    return reacao !== null;
  }

  async criarReacao(data: CriarReacaoData): Promise<StoryReacao> {
    const reacao = await this.prisma.storyReacao.create({ data });
    return {
      id: reacao.id,
      storyId: reacao.storyId,
      remetenteId: reacao.remetenteId,
      criadoEm: reacao.criadoEm,
    };
  }

  async criarVisualizacoesBatch(dados: CriarVisualizacaoData[]): Promise<void> {
    if (dados.length === 0) return;
    await this.prisma.storyVisualizacao.createMany({
      data: dados.map((d) => ({
        storyId: d.storyId,
        usuarioId: d.usuarioId,
      })),
      skipDuplicates: true,
    });
  }

  async buscarVisualizacoes(
    storyIds: string[],
    usuarioId: string,
  ): Promise<Set<string>> {
    if (storyIds.length === 0) return new Set();
    const visualizacoes = await this.prisma.storyVisualizacao.findMany({
      where: { storyId: { in: storyIds }, usuarioId },
      select: { storyId: true },
    });
    return new Set(visualizacoes.map((v) => v.storyId));
  }

  async existeStory(
    grupoId: string,
    usuarioId: string,
    jogoId: string,
    tipo: TipoStory,
  ): Promise<boolean> {
    const story = await this.prisma.story.findUnique({
      where: {
        grupoId_usuarioId_jogoId_tipo: { grupoId, usuarioId, jogoId, tipo },
      },
    });
    return story !== null;
  }

  async removerAntigos(diasLimite: number): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() - diasLimite);

    const result = await this.prisma.story.deleteMany({
      where: { criadoEm: { lt: limite } },
    });
    return result.count;
  }

  private mapear(story: {
    id: string;
    grupoId: string;
    usuarioId: string;
    jogoId: string;
    rodada: number | null;
    tipo: string;
    dados: unknown;
    titulo: string;
    contadorFs: number;
    criadoEm: Date;
  }): Story {
    return {
      id: story.id,
      grupoId: story.grupoId,
      usuarioId: story.usuarioId,
      jogoId: story.jogoId,
      rodada: story.rodada,
      tipo: story.tipo as TipoStory,
      dados: story.dados as Record<string, unknown>,
      titulo: story.titulo,
      contadorFs: story.contadorFs,
      criadoEm: story.criadoEm,
    };
  }
}

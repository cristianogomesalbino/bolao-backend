import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DESTAQUES } from '../destaques.constants';
import type {
  DestaqueRepository,
  CriarDestaqueData,
  CriarReacaoData,
  CriarVisualizacaoData,
  Destaque,
  DestaqueComAutor,
  DestaqueReacao,
} from './destaque.repository.interface';
import type { TipoDestaque } from '../types/destaque.types';

@Injectable()
export class PrismaDestaqueRepository implements DestaqueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarDestaqueData): Promise<Destaque> {
    const destaque = await this.prisma.destaque.create({
      data: {
        ...data,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        dados: data.dados as unknown as Prisma.InputJsonValue,
      },
    });
    return this.mapear(destaque);
  }

  async criarVarios(data: CriarDestaqueData[]): Promise<void> {
    if (data.length === 0) return;
    await this.prisma.destaque.createMany({
      data: data.map((d) => ({
        ...d,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        dados: d.dados as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  async buscarPorId(id: string): Promise<Destaque | null> {
    const destaque = await this.prisma.destaque.findUnique({ where: { id } });
    return destaque ? this.mapear(destaque) : null;
  }

  async buscarPorGrupoERodadas(
    grupoId: string,
    rodadas: number[],
    limite: number,
  ): Promise<DestaqueComAutor[]> {
    if (rodadas.length === 0) return [];

    const destaques = await this.prisma.destaque.findMany({
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
    const prioridades = DESTAQUES.PRIORIDADE_POR_TIPO;
    return destaques
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
    return this.prisma.destaque.count({
      where: { grupoId, rodada: { in: rodadas } },
    });
  }

  async incrementarContadorFs(destaqueId: string): Promise<number> {
    const updated = await this.prisma.destaque.update({
      where: { id: destaqueId },
      data: { contadorFs: { increment: 1 } },
    });
    return updated.contadorFs;
  }

  async existeReacao(
    remetenteId: string,
    destaqueId: string,
  ): Promise<boolean> {
    const reacao = await this.prisma.destaqueReacao.findUnique({
      where: {
        remetenteId_destaqueId: { remetenteId, destaqueId },
      },
    });
    return reacao !== null;
  }

  async buscarReacoesDoUsuario(
    remetenteId: string,
    destaqueIds: string[],
  ): Promise<Set<string>> {
    if (destaqueIds.length === 0) return new Set();
    const reacoes = await this.prisma.destaqueReacao.findMany({
      where: { remetenteId, destaqueId: { in: destaqueIds } },
      select: { destaqueId: true },
    });
    return new Set(reacoes.map((r) => r.destaqueId));
  }

  async criarReacao(data: CriarReacaoData): Promise<DestaqueReacao> {
    const reacao = await this.prisma.destaqueReacao.create({ data });
    return {
      id: reacao.id,
      destaqueId: reacao.destaqueId,
      remetenteId: reacao.remetenteId,
      criadoEm: reacao.criadoEm,
    };
  }

  async criarVisualizacoesBatch(dados: CriarVisualizacaoData[]): Promise<void> {
    if (dados.length === 0) return;
    await this.prisma.destaqueVisualizacao.createMany({
      data: dados.map((d) => ({
        destaqueId: d.destaqueId,
        usuarioId: d.usuarioId,
      })),
      skipDuplicates: true,
    });
  }

  async buscarVisualizacoes(
    destaqueIds: string[],
    usuarioId: string,
  ): Promise<Set<string>> {
    if (destaqueIds.length === 0) return new Set();
    const visualizacoes = await this.prisma.destaqueVisualizacao.findMany({
      where: { destaqueId: { in: destaqueIds }, usuarioId },
      select: { destaqueId: true },
    });
    return new Set(visualizacoes.map((v) => v.destaqueId));
  }

  async existeDestaque(
    grupoId: string,
    usuarioId: string,
    jogoId: string,
    tipo: TipoDestaque,
  ): Promise<boolean> {
    const destaque = await this.prisma.destaque.findUnique({
      where: {
        grupoId_usuarioId_jogoId_tipo: { grupoId, usuarioId, jogoId, tipo },
      },
    });
    return destaque !== null;
  }

  async removerAntigos(diasLimite: number): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() - diasLimite);

    const result = await this.prisma.destaque.deleteMany({
      where: { criadoEm: { lt: limite } },
    });
    return result.count;
  }

  private mapear(destaque: {
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
  }): Destaque {
    return {
      id: destaque.id,
      grupoId: destaque.grupoId,
      usuarioId: destaque.usuarioId,
      jogoId: destaque.jogoId,
      rodada: destaque.rodada,
      tipo: destaque.tipo as TipoDestaque,
      dados: destaque.dados as Record<string, unknown>,
      titulo: destaque.titulo,
      contadorFs: destaque.contadorFs,
      criadoEm: destaque.criadoEm,
    };
  }
}

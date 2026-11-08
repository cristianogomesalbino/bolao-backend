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
import { mapearDestaque } from './destaque.mapper';

@Injectable()
export class PrismaDestaqueRepository implements DestaqueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarDestaqueData): Promise<Destaque> {
    const destaque = await this.prisma.destaque.create({
      data: {
        ...data,
        dados: data.dados as unknown as Prisma.InputJsonValue,
      },
    });
    return mapearDestaque(destaque);
  }

  async criarVarios(data: CriarDestaqueData[]): Promise<void> {
    if (data.length === 0) return;
    await this.prisma.destaque.createMany({
      data: data.map((d) => ({
        ...d,

        dados: d.dados as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  async buscarPorId(id: string): Promise<Destaque | null> {
    const destaque = await this.prisma.destaque.findUnique({ where: { id } });
    return destaque ? mapearDestaque(destaque) : null;
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
        tipo: { not: 'SEQUENCIA_MOSCA' },
      },
      include: {
        usuario: { select: { id: true, nome: true } },
      },
      orderBy: [{ rodada: 'desc' }, { criadoEm: 'desc' }],
      take: limite,
    });

    // Re-ordena em memória para aplicar prioridade por tipo (não possível no SQL)
    return destaques
      .sort((a, b) => {
        if (a.rodada !== b.rodada) return (b.rodada ?? 0) - (a.rodada ?? 0);
        const dateDiff = b.criadoEm.getTime() - a.criadoEm.getTime();
        if (dateDiff !== 0) return dateDiff;
        return this.prioridadeTipo(a.tipo) - this.prioridadeTipo(b.tipo);
      })
      .map((s) => ({
        ...mapearDestaque(s),
        usuario: s.usuario,
      }));
  }

  contarPorGrupoERodadas(grupoId: string, rodadas: number[]): Promise<number> {
    if (rodadas.length === 0) return Promise.resolve(0);
    return this.prisma.destaque.count({
      where: { grupoId, rodada: { in: rodadas } },
    });
  }

  async listarRodadasPorGrupo(grupoId: string): Promise<number[]> {
    const grupos = await this.prisma.destaque.groupBy({
      by: ['rodada'],
      where: { grupoId, rodada: { not: null } },
      orderBy: { rodada: 'desc' },
    });
    return grupos
      .map((g) => g.rodada)
      .filter((rodada): rodada is number => rodada != null);
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

  async filtrarIdsDoGrupo(
    grupoId: string,
    destaqueIds: string[],
  ): Promise<string[]> {
    if (destaqueIds.length === 0) return [];
    const encontrados = await this.prisma.destaque.findMany({
      where: { grupoId, id: { in: destaqueIds } },
      select: { id: true },
    });
    return encontrados.map((item) => item.id);
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

  async buscarUnicosNaMoscaDaRodada(
    grupoId: string,
    usuarioId: string,
    jogoIds: string[],
  ): Promise<Set<string>> {
    if (jogoIds.length === 0) return new Set();
    const encontrados = await this.prisma.destaque.findMany({
      where: {
        grupoId,
        usuarioId,
        jogoId: { in: jogoIds },
        tipo: 'UNICO_NA_MOSCA',
      },
      select: { jogoId: true },
    });
    return new Set(encontrados.map((item) => item.jogoId));
  }

  async existeDestaqueNaRodada(
    grupoId: string,
    usuarioId: string,
    rodada: number,
    tipo: TipoDestaque,
  ): Promise<boolean> {
    const destaque = await this.prisma.destaque.findFirst({
      where: { grupoId, usuarioId, rodada, tipo },
      select: { id: true },
    });
    return destaque !== null;
  }

  async buscarNaRodada(
    grupoId: string,
    usuarioId: string,
    rodada: number,
    tipo: TipoDestaque,
  ): Promise<Destaque | null> {
    const destaque = await this.prisma.destaque.findFirst({
      where: { grupoId, usuarioId, rodada, tipo },
      orderBy: { criadoEm: 'asc' },
    });
    return destaque ? mapearDestaque(destaque) : null;
  }

  async atualizar(
    id: string,
    data: { dados: object; titulo: string },
  ): Promise<void> {
    await this.prisma.destaque.update({
      where: { id },
      data: {
        dados: data.dados as unknown as Prisma.InputJsonValue,
        titulo: data.titulo,
      },
    });
  }

  async removerPorTiposNaRodada(
    grupoId: string,
    usuarioId: string,
    rodada: number,
    tipos: TipoDestaque[],
    excetoId?: string,
  ): Promise<void> {
    await this.prisma.destaque.deleteMany({
      where: {
        grupoId,
        usuarioId,
        rodada,
        tipo: { in: tipos },
        ...(excetoId ? { id: { not: excetoId } } : {}),
      },
    });
  }

  async removerAntigos(diasLimite: number): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() - diasLimite);

    const result = await this.prisma.destaque.deleteMany({
      where: { criadoEm: { lt: limite } },
    });
    return result.count;
  }

  private prioridadeTipo(tipo: TipoDestaque): number {
    const prioridades = DESTAQUES.PRIORIDADE_POR_TIPO;
    if (tipo === 'SEQUENCIA_MOSCA') return 99;
    return prioridades[tipo];
  }
}

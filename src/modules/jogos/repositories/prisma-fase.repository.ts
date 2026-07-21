import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  Fase,
  FaseComTemporada,
  CriarFaseData,
  FaseRepository,
} from './fase.repository.interface';

@Injectable()
export class PrismaFaseRepository implements FaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: CriarFaseData): Promise<Fase> {
    return this.prisma.fase.create({ data }) as unknown as Promise<Fase>;
  }

  async criarVarios(data: CriarFaseData[]): Promise<Fase[]> {
    await this.prisma.fase.createMany({ data: data as never });
    return this.prisma.fase.findMany({
      where: { temporadaId: data[0]?.temporadaId },
      orderBy: { ordem: 'asc' },
    }) as unknown as Promise<Fase[]>;
  }

  async buscarPorId(id: string): Promise<FaseComTemporada | null> {
    return this.prisma.fase.findUnique({
      where: { id },
      include: { temporada: { include: { campeonato: true } } },
    }) as unknown as Promise<FaseComTemporada | null>;
  }

  async buscarPorTemporada(temporadaId: string): Promise<Fase[]> {
    return this.prisma.fase.findMany({
      where: { temporadaId },
      orderBy: { ordem: 'asc' },
    }) as unknown as Promise<Fase[]>;
  }

  async buscarPorCampeonatoENome(
    nomeCampeonato: string,
    nomeFase: string,
  ): Promise<{ id: string } | null> {
    const where: Record<string, unknown> = {
      temporada: {
        campeonato: { nome: { contains: nomeCampeonato } },
      },
    };
    if (nomeFase) {
      const ehExato = nomeFase.startsWith('EXACT:');
      const nome = ehExato ? nomeFase.slice(6) : nomeFase;
      where.nome = ehExato ? { equals: nome } : { contains: nome };
    }

    const fase = await this.prisma.fase.findFirst({
      where,
      orderBy: { temporada: { ano: 'desc' } },
      select: { id: true },
    });
    return fase;
  }
}

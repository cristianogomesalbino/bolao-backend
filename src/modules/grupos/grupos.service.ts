import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { UpdateStatusGrupoDto } from './dto/update-status-grupo.dto';
import { nanoid } from 'nanoid';
import { ErrorFactory } from '../../common/errors/error.factory';
import { GRUPOS } from './grupos.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';

const includeGrupo = {
  temporada: {
    include: {
      campeonato: true,
    },
  },
};

@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarGrupoDto, userId: string) {
    const temporada = await this.prisma.temporada.findUnique({
      where: { id: dto.temporadaId },
    });

    if (!temporada) {
      throw ErrorFactory.notFound(GRUPOS.MENSAGENS.TEMPORADA_NAO_ENCONTRADA);
    }

    const codigoConvite = dto.privado ? nanoid(8).toUpperCase() : null;

    return this.prisma.$transaction(async (tx) => {
      const grupo = await tx.grupo.create({
        data: {
          nome: dto.nome,
          temporadaId: dto.temporadaId,
          privado: dto.privado,
          codigoConvite,
          permitirPalpiteAutomatico: dto.permitirPalpiteAutomatico ?? false,
          maxParticipantes: dto.maxParticipantes ?? 50,
          createdById: userId,
        },
        include: includeGrupo,
      });

      await tx.grupoUsuario.create({
        data: {
          usuarioId: userId,
          grupoId: grupo.id,
          role: GRUPO_ROLE.ADMIN,
        },
      });

      return grupo;
    });
  }

  async buscarTodos() {
    return this.prisma.grupo.findMany({
      where: { ativo: true },
      include: includeGrupo,
    });
  }

  async buscarPorId(id: string) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id },
      include: includeGrupo,
    });

    if (!grupo || !grupo.ativo) {
      throw ErrorFactory.notFound(GRUPOS.MENSAGENS.GRUPO_NAO_ENCONTRADO);
    }

    return grupo;
  }

  async atualizar(id: string, dto: UpdateGrupoDto) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id },
    });

    if (!grupo || !grupo.ativo) {
      throw ErrorFactory.notFound(GRUPOS.MENSAGENS.GRUPO_NAO_ENCONTRADO);
    }

    return this.prisma.grupo.update({
      where: { id },
      data: {
        nome: dto.nome ?? grupo.nome,
        privado: dto.privado ?? grupo.privado,
        permitirPalpiteAutomatico:
          dto.permitirPalpiteAutomatico ?? grupo.permitirPalpiteAutomatico,
      },
    });
  }

  async atualizarStatus(id: string, dto: UpdateStatusGrupoDto) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id },
    });

    if (!grupo) {
      throw ErrorFactory.notFound(GRUPOS.MENSAGENS.GRUPO_NAO_ENCONTRADO);
    }

    return this.prisma.grupo.update({
      where: { id },
      data: {
        ativo: dto.ativo,
      },
    });
  }

  async remover(id: string) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id },
    });

    if (!grupo) {
      throw ErrorFactory.notFound(GRUPOS.MENSAGENS.GRUPO_NAO_ENCONTRADO);
    }

    if (grupo.ativo) {
      throw ErrorFactory.badRequest(GRUPOS.MENSAGENS.DESATIVE_ANTES_EXCLUIR);
    }

    await this.prisma.grupo.delete({
      where: { id },
    });

    return {
      mensagem: GRUPOS.MENSAGENS.GRUPO_EXCLUIDO,
    };
  }
}

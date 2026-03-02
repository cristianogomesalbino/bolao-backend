import { Injectable } from '@nestjs/common';
import { CriarGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateStatusGrupoDto } from './dto/update-status-grupo.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class GruposService {

  constructor(private prisma: PrismaService) {}

  async criar(dto: CriarGrupoDto) {
  const {
    nome,
    temporadaId,
    privado,
    permitirPalpiteAutomatico,
    maxParticipantes,
  } = dto;

  const temporada = await this.prisma.temporada.findUnique({
    where: { id: temporadaId },
  });

  if (!temporada) {
    throw new NotFoundException({
      erros: [
        {
          campo: 'temporadaId',
          mensagens: ['Temporada não encontrada.'],
        },
      ],
    });
  }

  const codigoConvite = privado ? nanoid(8).toUpperCase() : null;

  // TODO: Quando implementar auth, pegar usuarioId do token JWT
  const usuarioIdTemporario = '00000000-0000-0000-0000-000000000000';

  return await this.prisma.$transaction(async (tx) => {
    const grupo = await tx.grupo.create({
      data: {
        nome,
        temporadaId,
        privado,
        codigoConvite,
        permitirPalpiteAutomatico: permitirPalpiteAutomatico ?? false,
        maxParticipantes: maxParticipantes ?? 50,
        createdById: usuarioIdTemporario,
      },
      include: {
        temporada: {
          include: {
            campeonato: true,
          },
        },
      },
    });

    await tx.grupoUsuario.create({
      data: {
        usuarioId: usuarioIdTemporario,
        grupoId: grupo.id,
        role: 'ADMIN',
      },
    });

    return grupo;
  });
}
  
  async buscarTodos() {
    return await this.prisma.grupo.findMany({
      where: { ativo: true },
      include: {
        temporada: {
          include: {
            campeonato: true,
          },
        },
      },
    });
  } 

  async buscarPorId(id: string) {
    const grupo = await this.prisma.grupo.findFirst({
      where: {
        id,
        ativo: true,
      },
      include: {
        temporada: {
          include: {
            campeonato: true,
          },
        },
      },
    });
  
    if (!grupo) {
      throw new NotFoundException({
        erros: [
          {
            campo: 'id',
            mensagens: ['Grupo não encontrado.'],
          },
        ],
      });
    }
  
    return grupo;
  }  

  async atualizar(id: string, updateGrupoDto: UpdateGrupoDto) {

    const grupo = await this.prisma.grupo.findUnique({
      where: { id },
    });
  
    if (!grupo || !grupo.ativo) {
      throw new NotFoundException({
        erros: [
          {
            campo: 'id',
            mensagens: ['Grupo não encontrado.'],
          },
        ],
      });
    }
  
    return await this.prisma.grupo.update({
      where: { id },
      data: {
        nome: updateGrupoDto.nome ?? grupo.nome,
        privado: updateGrupoDto.privado ?? grupo.privado,
        permitirPalpiteAutomatico: updateGrupoDto.permitirPalpiteAutomatico ?? grupo.permitirPalpiteAutomatico,
      },
    });
  }
  
  async updateStatus(id: string, dto: UpdateStatusGrupoDto) {

    const grupo = await this.prisma.grupo.findUnique({
      where: { id },
    });
  
    if (!grupo) {
      throw new NotFoundException({
        erros: [
          {
            campo: 'id',
            mensagens: ['Grupo não encontrado.'],
          },
        ],
      });
    }
  
    return await this.prisma.grupo.update({
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
      throw new NotFoundException({
        erros: [
          {
            campo: 'id',
            mensagens: ['Grupo não encontrado.'],
          },
        ],
      });
    }
  
    if (grupo.ativo) {
      throw new BadRequestException({
        erros: [
          {
            campo: 'ativo',
            mensagens: ['Desative o grupo antes de excluí-lo.'],
          },
        ],
      });
    }
  
    await this.prisma.grupo.delete({
      where: { id },
    });
  
    return {
      mensagem: 'Grupo excluído com sucesso.',
    };
  }  
}

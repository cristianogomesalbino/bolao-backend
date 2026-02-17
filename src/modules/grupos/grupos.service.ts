import { Injectable } from '@nestjs/common';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateStatusGrupoDto } from './dto/update-status-grupo.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class GruposService {

  constructor(private prisma: PrismaService) {}

  async create(createGrupoDto: CreateGrupoDto) {
    const {
      nome,
      temporadaId,
      adminId,
      privado,
      permitirPalpiteAutomatico,
      maxParticipantes,
    } = createGrupoDto;
  
    // 🔹 Validar temporada
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
  
    // 🔹 Validar admin
    const admin = await this.prisma.usuario.findUnique({
      where: { id: adminId },
    });
  
    if (!admin) {
      throw new NotFoundException({
        erros: [
          {
            campo: 'adminId',
            mensagens: ['Administrador não encontrado.'],
          },
        ],
      });
    }
  
    // 🔹 Gerar código
    const codigoConvite = privado ? nanoid(8).toUpperCase() : null;
  
    return await this.prisma.grupo.create({
      data: {
        nome,
        temporadaId,
        adminId,
        privado,
        codigoConvite,
        permitirPalpiteAutomatico: permitirPalpiteAutomatico ?? false,
        maxParticipantes: maxParticipantes ?? 50,
      },
      include: {
        temporada: {
          include: {
            campeonato: true,
          },
        },
      },
    });
  }
  
  
  async findAll() {
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

  async findOne(id: string) {
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

  async update(id: string, updateGrupoDto: UpdateGrupoDto) {

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
  
  async remove(id: string) {

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
        ativo: false,
      },
    });
  }  
}

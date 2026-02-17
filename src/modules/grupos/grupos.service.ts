import { Injectable } from '@nestjs/common';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
  
    const temporada = await this.prisma.temporada.findUnique({
      where: { id: temporadaId },
    });
  
    if (!temporada) {
      throw new NotFoundException('Temporada não encontrada.');
    }
  
    const codigoConvite = privado ? nanoid(8).toUpperCase() : null;
  
    try {
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
    } catch (error) {
      throw error;
    }
  }
  
  findAll() {
    return `This action returns all grupos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} grupo`;
  }

  update(id: number, updateGrupoDto: UpdateGrupoDto) {
    return `This action updates a #${id} grupo`;
  }

  remove(id: number) {
    return `This action removes a #${id} grupo`;
  }
}

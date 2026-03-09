import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddUsuarioGrupoDto } from './dto/add-usuario-grupo.dto';

@Injectable()
export class GrupoUsuarioService {
  constructor(private prisma: PrismaService) {}

  async adicionar(dto: AddUsuarioGrupoDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const grupo = await this.prisma.grupo.findUnique({
      where: { id: dto.grupoId },
    });

    if (!grupo) {
      throw new NotFoundException('Grupo não encontrado');
    }

    const jaExiste = await this.prisma.grupoUsuario.findUnique({
      where: {
        usuarioId_grupoId: {
          usuarioId: dto.usuarioId,
          grupoId: dto.grupoId,
        },
      },
    });

    if (jaExiste) {
      throw new ConflictException('Usuário já está neste grupo');
    }

    return this.prisma.grupoUsuario.create({
      data: {
        usuarioId: dto.usuarioId,
        grupoId: dto.grupoId,
      },
    });
  }

  async listarUsuariosDoGrupo(grupoId: string) {
    return this.prisma.grupoUsuario.findMany({
      where: {
        grupoId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  async removerUsuario(grupoId: string, usuarioId: string) {
    const registro = await this.prisma.grupoUsuario.findUnique({
      where: {
        usuarioId_grupoId: {
          usuarioId,
          grupoId,
        },
      },
    });

    if (!registro) {
      throw new NotFoundException('Usuário não está neste grupo');
    }

    await this.prisma.grupoUsuario.delete({
      where: {
        usuarioId_grupoId: {
          usuarioId,
          grupoId,
        },
      },
    });

    return { message: 'Usuário removido do grupo' };
  }
}

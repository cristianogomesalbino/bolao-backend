import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorFactory } from '../../common/errors/error.factory';

const ROLE_ADMIN = 'ADMIN';
const ROLE_MEMBER = 'MEMBER';

function compositeKey(usuarioId: string, grupoId: string) {
  return { usuarioId_grupoId: { usuarioId, grupoId } };
}

@Injectable()
export class GrupoUsuarioService {
  constructor(private readonly prisma: PrismaService) {}

  async entrarPorConvite(codigoConvite: string, usuarioId: string) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { codigoConvite },
    });

    if (!grupo) {
      throw ErrorFactory.notFound('Código de convite inválido');
    }

    if (!grupo.ativo) {
      throw ErrorFactory.badRequest('Grupo está inativo');
    }

    await this.validarEntrada(usuarioId, grupo.id, grupo.maxParticipantes);

    return this.prisma.grupoUsuario.create({
      data: {
        usuarioId,
        grupoId: grupo.id,
        role: ROLE_MEMBER,
      },
      include: {
        grupo: { select: { id: true, nome: true } },
      },
    });
  }

  async listarMembros(grupoId: string) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      throw ErrorFactory.notFound('Grupo não encontrado');
    }

    return this.prisma.grupoUsuario.findMany({
      where: { grupoId },
      select: {
        role: true,
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });
  }

  async sair(grupoId: string, usuarioId: string) {
    const registro = await this.buscarRegistroOuFalhar(
      usuarioId,
      grupoId,
      'Você não está neste grupo',
    );

    if (registro.role === ROLE_ADMIN) {
      await this.validarUnicoAdmin(grupoId);
    }

    await this.prisma.grupoUsuario.delete({
      where: compositeKey(usuarioId, grupoId),
    });

    return { mensagem: 'Você saiu do grupo' };
  }

  async removerMembro(grupoId: string, usuarioId: string) {
    await this.buscarRegistroOuFalhar(
      usuarioId,
      grupoId,
      'Usuário não está neste grupo',
    );

    await this.prisma.grupoUsuario.delete({
      where: compositeKey(usuarioId, grupoId),
    });

    return { mensagem: 'Usuário removido do grupo' };
  }

  async adicionarPorEmail(grupoId: string, email: string) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      throw ErrorFactory.notFound('Grupo não encontrado');
    }

    if (!grupo.ativo) {
      throw ErrorFactory.badRequest('Grupo está inativo');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw ErrorFactory.notFound('Usuário não encontrado');
    }

    await this.validarEntrada(usuario.id, grupoId, grupo.maxParticipantes);

    return this.prisma.grupoUsuario.create({
      data: {
        usuarioId: usuario.id,
        grupoId,
        role: ROLE_MEMBER,
      },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        grupo: { select: { id: true, nome: true } },
      },
    });
  }


  private async validarEntrada(
    usuarioId: string,
    grupoId: string,
    maxParticipantes: number,
  ) {
    const jaExiste = await this.prisma.grupoUsuario.findUnique({
      where: compositeKey(usuarioId, grupoId),
    });

    if (jaExiste) {
      throw ErrorFactory.conflict('Você já está neste grupo');
    }

    const totalMembros = await this.prisma.grupoUsuario.count({
      where: { grupoId },
    });

    if (totalMembros >= maxParticipantes) {
      throw ErrorFactory.badRequest('Grupo atingiu o limite de participantes');
    }
  }

  private async buscarRegistroOuFalhar(
    usuarioId: string,
    grupoId: string,
    mensagem: string,
  ) {
    const registro = await this.prisma.grupoUsuario.findUnique({
      where: compositeKey(usuarioId, grupoId),
    });

    if (!registro) {
      throw ErrorFactory.notFound(mensagem);
    }

    return registro;
  }

  private async validarUnicoAdmin(grupoId: string) {
    const admins = await this.prisma.grupoUsuario.count({
      where: { grupoId, role: ROLE_ADMIN },
    });

    if (admins <= 1) {
      throw ErrorFactory.badRequest(
        'Não é possível sair sendo o único administrador do grupo',
      );
    }
  }
}

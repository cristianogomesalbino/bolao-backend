import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorFactory } from '../../common/errors/error.factory';
import { GRUPO_USUARIO } from './grupo-usuario.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';

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
      throw ErrorFactory.notFound(
        GRUPO_USUARIO.MENSAGENS.CODIGO_CONVITE_INVALIDO,
      );
    }

    if (!grupo.ativo) {
      throw ErrorFactory.badRequest(GRUPO_USUARIO.MENSAGENS.GRUPO_INATIVO);
    }

    await this.validarEntrada(usuarioId, grupo.id, grupo.maxParticipantes);

    return this.prisma.grupoUsuario.create({
      data: {
        usuarioId,
        grupoId: grupo.id,
        role: GRUPO_ROLE.MEMBER,
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
      throw ErrorFactory.notFound(GRUPO_USUARIO.MENSAGENS.GRUPO_NAO_ENCONTRADO);
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
      GRUPO_USUARIO.MENSAGENS.NAO_ESTA_NO_GRUPO,
    );

    if (registro.role === GRUPO_ROLE.ADMIN) {
      await this.validarUnicoAdmin(grupoId);
    }

    await this.prisma.grupoUsuario.delete({
      where: compositeKey(usuarioId, grupoId),
    });

    return { mensagem: GRUPO_USUARIO.MENSAGENS.SAIU_DO_GRUPO };
  }

  async removerMembro(grupoId: string, usuarioId: string) {
    await this.buscarRegistroOuFalhar(
      usuarioId,
      grupoId,
      GRUPO_USUARIO.MENSAGENS.USUARIO_NAO_ESTA_NO_GRUPO,
    );

    await this.prisma.grupoUsuario.delete({
      where: compositeKey(usuarioId, grupoId),
    });

    return { mensagem: GRUPO_USUARIO.MENSAGENS.USUARIO_REMOVIDO };
  }

  async adicionarPorEmail(grupoId: string, email: string) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      throw ErrorFactory.notFound(GRUPO_USUARIO.MENSAGENS.GRUPO_NAO_ENCONTRADO);
    }

    if (!grupo.ativo) {
      throw ErrorFactory.badRequest(GRUPO_USUARIO.MENSAGENS.GRUPO_INATIVO);
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw ErrorFactory.notFound(
        GRUPO_USUARIO.MENSAGENS.USUARIO_NAO_ENCONTRADO,
      );
    }

    await this.validarEntrada(usuario.id, grupoId, grupo.maxParticipantes);

    return this.prisma.grupoUsuario.create({
      data: {
        usuarioId: usuario.id,
        grupoId,
        role: GRUPO_ROLE.MEMBER,
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
      throw ErrorFactory.conflict(GRUPO_USUARIO.MENSAGENS.JA_ESTA_NO_GRUPO);
    }

    const totalMembros = await this.prisma.grupoUsuario.count({
      where: { grupoId },
    });

    if (totalMembros >= maxParticipantes) {
      throw ErrorFactory.badRequest(
        GRUPO_USUARIO.MENSAGENS.LIMITE_PARTICIPANTES,
      );
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
      where: { grupoId, role: GRUPO_ROLE.ADMIN },
    });

    if (admins <= 1) {
      throw ErrorFactory.badRequest(GRUPO_USUARIO.MENSAGENS.UNICO_ADMIN);
    }
  }
}

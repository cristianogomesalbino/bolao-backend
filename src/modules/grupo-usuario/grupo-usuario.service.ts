import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorFactory } from '../../common/errors/error.factory';
import {
  CodigoConviteInvalidoError,
  GrupoInativoError,
  JaEstaNoGrupoError,
  LimiteParticipantesError,
  UnicoAdminError,
} from '../../common/errors/domain-errors';
import { GrupoNaoEncontradoError } from '../../common/errors/domain-errors/grupos.errors';
import { UsuarioNaoEncontradoError } from '../../common/errors/domain-errors/usuarios.errors';
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
      throw new CodigoConviteInvalidoError();
    }

    if (!grupo.ativo) {
      throw new GrupoInativoError();
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
      throw new GrupoNaoEncontradoError();
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
      throw new GrupoNaoEncontradoError();
    }

    if (!grupo.ativo) {
      throw new GrupoInativoError();
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw new UsuarioNaoEncontradoError();
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
      throw new JaEstaNoGrupoError();
    }

    const totalMembros = await this.prisma.grupoUsuario.count({
      where: { grupoId },
    });

    if (totalMembros >= maxParticipantes) {
      throw new LimiteParticipantesError();
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
      throw new UnicoAdminError();
    }
  }
}

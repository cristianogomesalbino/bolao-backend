import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EmailJaCadastradoError,
  UsuarioNaoEncontradoError,
} from '../../common/errors/domain-errors';
import * as bcrypt from 'bcryptjs';
import { USUARIOS } from './usuarios.constants';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(data: { nome: string; email: string; senha: string }) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (existe) {
      throw new EmailJaCadastradoError();
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        ativo: true,
      },
    });

    return usuario;
  }

  async listar() {
    return this.prisma.usuario.findMany({
      where: { ativo: true },
    });
  }

  async buscarPorId(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario || !usuario.ativo) {
      throw new UsuarioNaoEncontradoError();
    }

    return usuario;
  }

  async atualizar(
    id: string,
    data: { nome?: string; email?: string; senha?: string },
  ) {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente || !usuarioExistente.ativo) {
      throw new UsuarioNaoEncontradoError();
    }

    let senhaHash: string | undefined;

    if (data.senha) {
      senhaHash = await bcrypt.hash(data.senha, 10);
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
      },
    });
  }

  async remover(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new UsuarioNaoEncontradoError();
    }

    if (!usuario.ativo) {
      return { mensagem: USUARIOS.MENSAGENS.USUARIO_JA_INATIVO };
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { ativo: false },
    });

    return { mensagem: USUARIOS.MENSAGENS.USUARIO_DESATIVADO };
  }

  async buscarPorEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }
}

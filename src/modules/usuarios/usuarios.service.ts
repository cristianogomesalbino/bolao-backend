import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { ErrorFactory } from '../../common/errors/error.factory';
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
      throw ErrorFactory.conflict(USUARIOS.MENSAGENS.EMAIL_JA_CADASTRADO);
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

    return UsuarioResponseDto.fromEntity(usuario);
  }

  async listar() {
    const usuarios = await this.prisma.usuario.findMany({
      where: { ativo: true },
    });

    return usuarios.map(UsuarioResponseDto.fromEntity);
  }

  async buscarPorId(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario || !usuario.ativo) {
      throw ErrorFactory.notFound(USUARIOS.MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    return UsuarioResponseDto.fromEntity(usuario);
  }

  async atualizar(
    id: string,
    data: { nome?: string; email?: string; senha?: string },
  ) {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente || !usuarioExistente.ativo) {
      throw ErrorFactory.notFound(USUARIOS.MENSAGENS.USUARIO_NAO_ENCONTRADO);
    }

    let senhaHash: string | undefined;

    if (data.senha) {
      senhaHash = await bcrypt.hash(data.senha, 10);
    }

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
      },
    });

    return UsuarioResponseDto.fromEntity(usuario);
  }

  async remover(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw ErrorFactory.notFound(USUARIOS.MENSAGENS.USUARIO_NAO_ENCONTRADO);
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

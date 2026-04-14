import { Inject, Injectable } from '@nestjs/common';
import {
  EmailJaCadastradoError,
  UsuarioNaoEncontradoError,
} from '../../common/errors/domain-errors';
import * as bcrypt from 'bcryptjs';
import { USUARIOS } from './usuarios.constants';
import type { UsuarioRepository } from './repositories/usuario.repository.interface';

@Injectable()
export class UsuariosService {
  constructor(
    @Inject(USUARIOS.REPOSITORY_TOKEN)
    private readonly usuarioRepo: UsuarioRepository,
  ) {}

  async criar(data: { nome: string; email: string; senha: string }) {
    const existe = await this.usuarioRepo.buscarPorEmail(data.email);

    if (existe) {
      throw new EmailJaCadastradoError();
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    return this.usuarioRepo.criar({
      nome: data.nome,
      email: data.email,
      senha: senhaHash,
      ativo: true,
    });
  }

  async listar() {
    return this.usuarioRepo.listar({ ativo: true });
  }

  async buscarPorId(id: string) {
    const usuario = await this.usuarioRepo.buscarPorId(id);

    if (!usuario || !usuario.ativo) {
      throw new UsuarioNaoEncontradoError();
    }

    return usuario;
  }

  async atualizar(
    id: string,
    data: { nome?: string; email?: string; senha?: string },
  ) {
    const usuarioExistente = await this.usuarioRepo.buscarPorId(id);

    if (!usuarioExistente || !usuarioExistente.ativo) {
      throw new UsuarioNaoEncontradoError();
    }

    let senhaHash: string | undefined;

    if (data.senha) {
      senhaHash = await bcrypt.hash(data.senha, 10);
    }

    return this.usuarioRepo.atualizar(id, {
      nome: data.nome,
      email: data.email,
      senha: senhaHash,
    });
  }

  async remover(id: string) {
    const usuario = await this.usuarioRepo.buscarPorId(id);

    if (!usuario) {
      throw new UsuarioNaoEncontradoError();
    }

    if (!usuario.ativo) {
      return { mensagem: USUARIOS.MENSAGENS.USUARIO_JA_INATIVO };
    }

    await this.usuarioRepo.desativar(id);

    return { mensagem: USUARIOS.MENSAGENS.USUARIO_DESATIVADO };
  }

  async buscarPorEmail(email: string) {
    return this.usuarioRepo.buscarPorEmail(email);
  }
}

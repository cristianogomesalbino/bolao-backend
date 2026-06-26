import { Inject, Injectable } from '@nestjs/common';
import {
  EmailJaCadastradoError,
  UsuarioNaoEncontradoError,
} from '../../common/errors/domain-errors';
import { ErrorFactory } from '../../common/errors/error.factory';
import * as bcrypt from 'bcryptjs';
import { USUARIOS } from './usuarios.constants';
import { AUTH } from '../auth/auth.constants';
import type { UsuarioRepository } from './repositories/usuario.repository.interface';
import { GRUPO_USUARIO } from '../grupo-usuario/grupo-usuario.constants';
import type { GrupoUsuarioRepository } from '../grupo-usuario/repositories/grupo-usuario.repository.interface';

@Injectable()
export class UsuariosService {
  constructor(
    @Inject(USUARIOS.REPOSITORY_TOKEN)
    private readonly usuarioRepo: UsuarioRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
  ) {}

  async criar(data: { nome: string; email: string; senha: string }) {
    const existe = await this.usuarioRepo.buscarPorEmail(data.email);

    if (existe) {
      throw new EmailJaCadastradoError();
    }

    const senhaHash = await bcrypt.hash(data.senha, AUTH.BCRYPT_ROUNDS);

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

    if (!usuario?.ativo) {
      throw new UsuarioNaoEncontradoError();
    }

    return usuario;
  }

  async atualizar(
    id: string,
    data: { nome?: string; email?: string; senha?: string },
  ) {
    const usuarioExistente = await this.usuarioRepo.buscarPorId(id);

    if (!usuarioExistente?.ativo) {
      throw new UsuarioNaoEncontradoError();
    }

    let senhaHash: string | undefined;

    if (data.senha) {
      senhaHash = await bcrypt.hash(data.senha, AUTH.BCRYPT_ROUNDS);
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

  async definirGrupoFavorito(usuarioId: string, grupoId: string | null) {
    const usuario = await this.usuarioRepo.buscarPorId(usuarioId);

    if (!usuario?.ativo) {
      throw new UsuarioNaoEncontradoError();
    }

    // Se grupoId é null, remove o favorito
    if (!grupoId) {
      return this.usuarioRepo.atualizar(usuarioId, { grupoFavoritoId: null });
    }

    // Validar que o usuário pertence ao grupo
    const membro = await this.grupoUsuarioRepo.buscarPorChave(
      usuarioId,
      grupoId,
    );

    if (!membro) {
      throw ErrorFactory.badRequest('Usuário não pertence ao grupo');
    }

    return this.usuarioRepo.atualizar(usuarioId, { grupoFavoritoId: grupoId });
  }
}

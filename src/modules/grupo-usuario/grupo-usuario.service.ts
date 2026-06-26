import { Inject, Injectable } from '@nestjs/common';
import { ErrorFactory } from '../../common/errors/error.factory';
import {
  CodigoConviteInvalidoError,
  GrupoInativoError,
  JaEstaNoGrupoError,
  LimiteParticipantesError,
  UnicoAdminError,
  ApenasCriadorPodePromoverError,
  MembroJaPossuiRoleError,
  NaoPodeRemoverCriadorError,
  NaoPodeAlterarRoleCriadorError,
  CriadorDeveTransferirError,
} from '../../common/errors/domain-errors';
import { GrupoNaoEncontradoError } from '../../common/errors/domain-errors/grupos.errors';
import { UsuarioNaoEncontradoError } from '../../common/errors/domain-errors/usuarios.errors';
import { GRUPO_USUARIO } from './grupo-usuario.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';
import type { GrupoUsuarioRepository } from './repositories/grupo-usuario.repository.interface';
import { GRUPOS } from '../grupos/grupos.constants';
import type { GrupoRepository } from '../grupos/repositories/grupo.repository.interface';
import { USUARIOS } from '../usuarios/usuarios.constants';
import type { UsuarioRepository } from '../usuarios/repositories/usuario.repository.interface';

@Injectable()
export class GrupoUsuarioService {
  constructor(
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
    @Inject(USUARIOS.REPOSITORY_TOKEN)
    private readonly usuarioRepo: UsuarioRepository,
  ) {}

  async entrarPorConvite(codigoConvite: string, usuarioId: string) {
    const grupo = await this.grupoRepo.buscarPorCodigoConvite(codigoConvite);

    if (!grupo) {
      throw new CodigoConviteInvalidoError();
    }

    if (!grupo.ativo) {
      throw new GrupoInativoError();
    }

    await this.validarEntrada(usuarioId, grupo.id, grupo.maxParticipantes);

    return this.grupoUsuarioRepo.criar(
      { usuarioId, grupoId: grupo.id, role: GRUPO_ROLE.MEMBER },
      { grupo: { select: { id: true, nome: true } } },
    );
  }

  async listarMembros(grupoId: string) {
    const grupo = await this.grupoRepo.buscarPorIdSimples(grupoId);

    if (!grupo) {
      throw new GrupoNaoEncontradoError();
    }

    return this.grupoUsuarioRepo.listarPorGrupo(grupoId);
  }

  async sair(grupoId: string, usuarioId: string) {
    const registro = await this.buscarRegistroOuFalhar(
      usuarioId,
      grupoId,
      GRUPO_USUARIO.MENSAGENS.NAO_ESTA_NO_GRUPO,
    );

    const grupo = await this.grupoRepo.buscarPorIdSimples(grupoId);

    if (grupo?.criadoPor === usuarioId) {
      throw new CriadorDeveTransferirError();
    }

    if (registro.role === GRUPO_ROLE.ADMIN) {
      await this.validarUnicoAdmin(grupoId);
    }

    await this.grupoUsuarioRepo.remover(usuarioId, grupoId);

    return { mensagem: GRUPO_USUARIO.MENSAGENS.SAIU_DO_GRUPO };
  }

  async removerMembro(grupoId: string, usuarioId: string) {
    const grupo = await this.grupoRepo.buscarPorIdSimples(grupoId);

    if (!grupo) {
      throw new GrupoNaoEncontradoError();
    }

    if (grupo.criadoPor === usuarioId) {
      throw new NaoPodeRemoverCriadorError();
    }

    await this.buscarRegistroOuFalhar(
      usuarioId,
      grupoId,
      GRUPO_USUARIO.MENSAGENS.USUARIO_NAO_ESTA_NO_GRUPO,
    );

    await this.grupoUsuarioRepo.remover(usuarioId, grupoId);

    return { mensagem: GRUPO_USUARIO.MENSAGENS.USUARIO_REMOVIDO };
  }

  async adicionarPorEmail(grupoId: string, email: string) {
    const grupo = await this.grupoRepo.buscarPorIdSimples(grupoId);

    if (!grupo) {
      throw new GrupoNaoEncontradoError();
    }

    if (!grupo.ativo) {
      throw new GrupoInativoError();
    }

    const usuario = await this.usuarioRepo.buscarPorEmail(email);

    if (!usuario) {
      throw new UsuarioNaoEncontradoError();
    }

    await this.validarEntrada(usuario.id, grupoId, grupo.maxParticipantes);

    return this.grupoUsuarioRepo.criar(
      { usuarioId: usuario.id, grupoId, role: GRUPO_ROLE.MEMBER },
      {
        usuario: { select: { id: true, nome: true, email: true } },
        grupo: { select: { id: true, nome: true } },
      },
    );
  }

  private async validarEntrada(
    usuarioId: string,
    grupoId: string,
    maxParticipantes: number,
  ) {
    const jaExiste = await this.grupoUsuarioRepo.buscarPorChave(
      usuarioId,
      grupoId,
    );

    if (jaExiste) {
      throw new JaEstaNoGrupoError();
    }

    const totalMembros = await this.grupoUsuarioRepo.contarPorGrupo(grupoId);

    if (totalMembros >= maxParticipantes) {
      throw new LimiteParticipantesError();
    }
  }

  private async buscarRegistroOuFalhar(
    usuarioId: string,
    grupoId: string,
    mensagem: string,
  ) {
    const registro = await this.grupoUsuarioRepo.buscarPorChave(
      usuarioId,
      grupoId,
    );

    if (!registro) {
      throw ErrorFactory.notFound(mensagem);
    }

    return registro;
  }

  private async validarUnicoAdmin(grupoId: string) {
    const admins = await this.grupoUsuarioRepo.contarAdminsPorGrupo(grupoId);

    if (admins <= 1) {
      throw new UnicoAdminError();
    }
  }

  async alterarRole(
    grupoId: string,
    usuarioId: string,
    novoRole: string,
    solicitanteId: string,
    transferirPropriedade = false,
  ) {
    const grupo = await this.grupoRepo.buscarPorIdSimples(grupoId);

    if (!grupo) {
      throw new GrupoNaoEncontradoError();
    }

    if (grupo.criadoPor !== solicitanteId) {
      throw new ApenasCriadorPodePromoverError();
    }

    if (grupo.criadoPor === usuarioId) {
      throw new NaoPodeAlterarRoleCriadorError();
    }

    const registro = await this.grupoUsuarioRepo.buscarPorChave(
      usuarioId,
      grupoId,
    );

    if (!registro) {
      throw ErrorFactory.notFound(
        GRUPO_USUARIO.MENSAGENS.USUARIO_NAO_ESTA_NO_GRUPO,
      );
    }

    if (registro.role === novoRole) {
      throw new MembroJaPossuiRoleError();
    }

    await this.grupoUsuarioRepo.atualizarRole(usuarioId, grupoId, novoRole);

    if (transferirPropriedade && novoRole === GRUPO_ROLE.ADMIN) {
      await this.grupoRepo.atualizar(grupoId, { criadoPor: usuarioId });
      return { mensagem: GRUPO_USUARIO.MENSAGENS.PROPRIEDADE_TRANSFERIDA };
    }

    return { mensagem: GRUPO_USUARIO.MENSAGENS.ROLE_ALTERADO };
  }
}

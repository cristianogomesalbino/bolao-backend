import { Inject, Injectable } from '@nestjs/common';
import { CriarGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { UpdateStatusGrupoDto } from './dto/update-status-grupo.dto';
import { FiltrarGruposDto } from './dto/filtrar-grupos.dto';
import { nanoid } from 'nanoid';
import {
  TemporadaNaoEncontradaError,
  GrupoNaoEncontradoError,
  DesativeAntesDeExcluirError,
} from '../../common/errors/domain-errors';
import { GRUPOS } from './grupos.constants';
import { GRUPO_ROLE } from '../../common/constants/roles.constants';
import type { GrupoRepository } from './repositories/grupo.repository.interface';
import { TEMPORADAS } from '../temporadas/temporadas.constants';
import type { TemporadaRepository } from '../temporadas/repositories/temporada.repository.interface';
import { GRUPO_USUARIO } from '../grupo-usuario/grupo-usuario.constants';
import type { GrupoUsuarioRepository } from '../grupo-usuario/repositories/grupo-usuario.repository.interface';

@Injectable()
export class GruposService {
  constructor(
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
    @Inject(TEMPORADAS.REPOSITORY_TOKEN)
    private readonly temporadaRepo: TemporadaRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
  ) {}

  async criar(dto: CriarGrupoDto, userId: string) {
    const temporada = await this.temporadaRepo.buscarPorId(dto.temporadaId);

    if (!temporada) {
      throw new TemporadaNaoEncontradaError();
    }

    const codigoConvite = dto.privado ? nanoid(GRUPOS.CODIGO_CONVITE_LENGTH).toUpperCase() : null;

    const grupo = await this.grupoRepo.criar({
      nome: dto.nome,
      temporadaId: dto.temporadaId,
      privado: dto.privado,
      codigoConvite,
      permitirPalpiteAutomatico: dto.permitirPalpiteAutomatico ?? false,
      maxParticipantes: dto.maxParticipantes ?? GRUPOS.MAX_PARTICIPANTES_DEFAULT,
      permitirPalpiteDobrado: dto.permitirPalpiteDobrado ?? false,
      criadoPor: userId,
    });

    await this.grupoUsuarioRepo.criar({
      usuarioId: userId,
      grupoId: grupo.id,
      role: GRUPO_ROLE.ADMIN,
    });

    return grupo;
  }

  async buscarTodos(filtros?: FiltrarGruposDto, usuarioId?: string) {
    return this.grupoRepo.buscarComFiltros({
      ativo: true,
      membro: filtros?.membro ?? true,
      usuarioId,
      privado: filtros?.privado,
      busca: filtros?.busca,
    });
  }

  async buscarPorId(id: string, usuarioId?: string) {
    const grupo = await this.grupoRepo.buscarPorId(id);

    if (!grupo?.ativo) {
      throw new GrupoNaoEncontradoError();
    }

    if (usuarioId) {
      const membro = await this.grupoUsuarioRepo.buscarPorChave(usuarioId, id);
      return { ...grupo, ehMembro: !!membro };
    }

    return { ...grupo, ehMembro: false };
  }

  async atualizar(id: string, dto: UpdateGrupoDto) {
    const grupo = await this.grupoRepo.buscarPorIdSimples(id);

    if (!grupo?.ativo) {
      throw new GrupoNaoEncontradoError();
    }

    return this.grupoRepo.atualizar(id, {
      nome: dto.nome ?? grupo.nome,
      privado: dto.privado ?? grupo.privado,
      permitirPalpiteAutomatico:
        dto.permitirPalpiteAutomatico ?? grupo.permitirPalpiteAutomatico,
      permitirPalpiteDobrado:
        dto.permitirPalpiteDobrado ?? grupo.permitirPalpiteDobrado,
    });
  }

  async atualizarStatus(id: string, dto: UpdateStatusGrupoDto) {
    const grupo = await this.grupoRepo.buscarPorIdSimples(id);

    if (!grupo) {
      throw new GrupoNaoEncontradoError();
    }

    return this.grupoRepo.atualizar(id, {
      ativo: dto.ativo,
    });
  }

  async remover(id: string) {
    const grupo = await this.grupoRepo.buscarPorIdSimples(id);

    if (!grupo) {
      throw new GrupoNaoEncontradoError();
    }

    if (grupo.ativo) {
      throw new DesativeAntesDeExcluirError();
    }

    await this.grupoRepo.remover(id);

    return {
      mensagem: GRUPOS.MENSAGENS.GRUPO_EXCLUIDO,
    };
  }

  async regenerarCodigoConvite(id: string) {
    const grupo = await this.grupoRepo.buscarPorIdSimples(id);

    if (!grupo?.ativo) {
      throw new GrupoNaoEncontradoError();
    }

    const novoCodigoConvite = nanoid(GRUPOS.CODIGO_CONVITE_LENGTH).toUpperCase();

    return this.grupoRepo.atualizar(id, { codigoConvite: novoCodigoConvite });
  }
}

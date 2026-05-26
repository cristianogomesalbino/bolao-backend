import { Inject, Injectable } from '@nestjs/common';
import { PALPITES } from '../palpites.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { GRUPO_USUARIO } from '../../grupo-usuario/grupo-usuario.constants';
import type { PalpiteRepository } from '../repositories/palpite.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { GrupoUsuarioRepository } from '../../grupo-usuario/repositories/grupo-usuario.repository.interface';
import { JogoNaoEncontradoError } from '../../../common/errors/domain-errors/jogos.errors';
import {
  PalpiteNaoEncontradoError,
  JogoNaoAceitaPalpitesError,
  PalpiteJaExisteError,
  PalpiteNaoPertenceAoUsuarioError,
} from '../../../common/errors/domain-errors/palpites.errors';
import { CriarPalpiteDto } from '../dto/criar-palpite.dto';
import { AtualizarPalpiteDto } from '../dto/atualizar-palpite.dto';
import type { PalpiteItemDto } from '../dto/criar-palpite-lote.dto';

@Injectable()
export class PalpiteService {
  constructor(
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
  ) {}

  async criar(jogoId: string, dto: CriarPalpiteDto, usuarioId: string) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();
    if (jogo.status !== 'AGENDADO' && jogo.status !== 'ADIADO')
      throw new JogoNaoAceitaPalpitesError();

    const existente = await this.palpiteRepo.buscarPorUsuarioEJogo(usuarioId, jogoId);
    if (existente) throw new PalpiteJaExisteError();

    return this.palpiteRepo.criar({
      usuarioId,
      jogoId,
      golsCasa: dto.golsCasa,
      golsFora: dto.golsFora,
    });
  }

  async atualizar(id: string, dto: AtualizarPalpiteDto, usuarioId: string) {
    const palpite = await this.buscarEValidarOwnership(id, usuarioId);

    const jogo = await this.jogoRepo.buscarPorId(palpite.jogoId);
    if (jogo.status !== 'AGENDADO' && jogo.status !== 'ADIADO')
      throw new JogoNaoAceitaPalpitesError();

    return this.palpiteRepo.atualizar(id, {
      golsCasa: dto.golsCasa,
      golsFora: dto.golsFora,
    });
  }

  async remover(id: string, usuarioId: string) {
    const palpite = await this.buscarEValidarOwnership(id, usuarioId);

    const jogo = await this.jogoRepo.buscarPorId(palpite.jogoId);
    if (jogo.status !== 'AGENDADO' && jogo.status !== 'ADIADO')
      throw new JogoNaoAceitaPalpitesError();

    await this.palpiteRepo.remover(id);
  }

  async buscarMeuPalpitePorJogo(jogoId: string, usuarioId: string) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();

    const palpite = await this.palpiteRepo.buscarPorUsuarioEJogo(usuarioId, jogoId);
    if (!palpite) throw new PalpiteNaoEncontradoError();

    return palpite;
  }

  async buscarMeusPalpitesPorJogos(jogoIds: string[], usuarioId: string) {
    return this.palpiteRepo.buscarPorUsuarioEJogos(usuarioId, jogoIds);
  }

  async listarMeusPalpites(usuarioId: string, filtros?: { temporadaId?: string }) {
    return this.palpiteRepo.listarPorUsuario(usuarioId, filtros);
  }

  async listarPorJogoNoGrupo(jogoId: string, grupoId: string, usuarioId: string) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();

    const membros = await this.grupoUsuarioRepo.listarPorGrupo(grupoId);
    const membrosIds = membros.map((m) => m.usuario.id);

    if (jogo.status === 'FINALIZADO') {
      return this.palpiteRepo.listarPorJogoEUsuarios(jogoId, membrosIds);
    }

    const meuPalpite = await this.palpiteRepo.buscarPorUsuarioEJogo(usuarioId, jogoId);
    return meuPalpite ? [meuPalpite] : [];
  }

  async buscarEstatisticasPorJogo(jogoId: string, grupoId: string) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();

    const membros = await this.grupoUsuarioRepo.listarPorGrupo(grupoId);
    const membrosIds = membros.map((m) => m.usuario.id);

    const palpites = await this.palpiteRepo.listarPorJogoEUsuarios(
      jogoId,
      membrosIds,
    );

    let vitoriaCasa = 0;
    let empate = 0;
    let vitoriaFora = 0;

    for (const p of palpites) {
      if (p.golsCasa > p.golsFora) vitoriaCasa++;
      else if (p.golsCasa === p.golsFora) empate++;
      else vitoriaFora++;
    }

    const total = palpites.length;

    return {
      total,
      vitoriaCasa,
      empate,
      vitoriaFora,
      percentualCasa: total > 0 ? Math.round((vitoriaCasa / total) * 100) : 0,
      percentualEmpate: total > 0 ? Math.round((empate / total) * 100) : 0,
      percentualFora: total > 0 ? Math.round((vitoriaFora / total) * 100) : 0,
    };
  }

  async criarLote(palpites: PalpiteItemDto[], usuarioId: string) {
    if (palpites.length === 0) return [];

    const jogoIds = palpites.map((p) => p.jogoId);
    const [jogos, palpitesExistentes] = await Promise.all([
      this.jogoRepo.buscarPorIds(jogoIds),
      this.palpiteRepo.buscarPorUsuarioEJogos(usuarioId, jogoIds),
    ]);

    const jogosMap = new Map(jogos.map((j) => [j.id, j]));
    const existentesSet = new Set(palpitesExistentes.map((p) => p.jogoId));

    const resultados: { jogoId: string; sucesso: boolean; palpite?: any; erro?: string }[] = [];

    for (const item of palpites) {
      const jogo = jogosMap.get(item.jogoId);
      if (!jogo) {
        resultados.push({ jogoId: item.jogoId, sucesso: false, erro: JOGOS.MENSAGENS.JOGO_NAO_ENCONTRADO });
        continue;
      }
      if (jogo.status !== 'AGENDADO' && jogo.status !== 'ADIADO') {
        resultados.push({ jogoId: item.jogoId, sucesso: false, erro: PALPITES.MENSAGENS.JOGO_NAO_ACEITA_PALPITES });
        continue;
      }
      if (existentesSet.has(item.jogoId)) {
        resultados.push({ jogoId: item.jogoId, sucesso: false, erro: PALPITES.MENSAGENS.PALPITE_JA_EXISTE });
        continue;
      }

      const palpite = await this.palpiteRepo.criar({
        usuarioId,
        jogoId: item.jogoId,
        golsCasa: item.golsCasa,
        golsFora: item.golsFora,
      });
      existentesSet.add(item.jogoId);
      resultados.push({ jogoId: item.jogoId, sucesso: true, palpite });
    }

    return resultados;
  }

  private async buscarEValidarOwnership(id: string, usuarioId: string) {
    const palpite = await this.palpiteRepo.buscarPorId(id);
    if (!palpite) throw new PalpiteNaoEncontradoError();
    if (palpite.usuarioId !== usuarioId) throw new PalpiteNaoPertenceAoUsuarioError();
    return palpite;
  }
}

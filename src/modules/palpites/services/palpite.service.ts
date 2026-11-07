import { Inject, Injectable } from '@nestjs/common';
import { PALPITES } from '../palpites.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import { GRUPO_USUARIO } from '../../grupo-usuario/grupo-usuario.constants';
import type {
  Palpite,
  PalpiteRepository,
} from '../repositories/palpite.repository.interface';
import type {
  Jogo,
  JogoRepository,
} from '../../jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type { GrupoUsuarioRepository } from '../../grupo-usuario/repositories/grupo-usuario.repository.interface';
import { JogoNaoEncontradoError } from '../../../common/errors/domain-errors/jogos.errors';
import { GrupoNaoEncontradoError } from '../../../common/errors/domain-errors/grupos.errors';
import {
  PalpiteNaoEncontradoError,
  JogoNaoAceitaPalpitesError,
  PalpiteJaExisteError,
  PalpiteNaoPertenceAoUsuarioError,
  JogoNaoPertenceAoGrupoError,
  JogoPendenteConfirmacaoError,
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
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
  ) {}

  async criar(jogoId: string, dto: CriarPalpiteDto, usuarioId: string) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();
    this.validarJogoAceitaPalpites(jogo);

    const existente = await this.palpiteRepo.buscarPorUsuarioEJogo(
      usuarioId,
      jogoId,
    );
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
    if (!jogo) throw new JogoNaoEncontradoError();
    this.validarJogoAceitaPalpites(jogo);

    return this.palpiteRepo.atualizar(id, {
      golsCasa: dto.golsCasa,
      golsFora: dto.golsFora,
    });
  }

  async remover(id: string, usuarioId: string) {
    const palpite = await this.buscarEValidarOwnership(id, usuarioId);

    const jogo = await this.jogoRepo.buscarPorId(palpite.jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();
    this.validarJogoAceitaPalpites(jogo);

    await this.palpiteRepo.remover(id);
  }

  async buscarMeuPalpitePorJogo(jogoId: string, usuarioId: string) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();

    return this.palpiteRepo.buscarPorUsuarioEJogo(usuarioId, jogoId);
  }

  async buscarMeusPalpitesPorJogos(jogoIds: string[], usuarioId: string) {
    return this.palpiteRepo.buscarPorUsuarioEJogos(usuarioId, jogoIds);
  }

  async listarMeusPalpites(
    usuarioId: string,
    filtros?: { temporadaId?: string },
  ) {
    return this.palpiteRepo.listarPorUsuario(usuarioId, filtros);
  }

  async listarPorJogoNoGrupo(
    jogoId: string,
    grupoId: string,
    _usuarioId: string,
  ) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();

    await this.validarJogoPertenceAoGrupo(jogo, grupoId);

    const membros = await this.grupoUsuarioRepo.listarPorGrupo(grupoId);
    const membrosIds = membros.map((m) => m.usuario.id);

    if (jogo.status === 'FINALIZADO' || jogo.status === 'EM_ANDAMENTO') {
      return this.palpiteRepo.listarPorJogoEUsuarios(jogoId, membrosIds);
    }

    // Jogo não iniciou: retornar todos os membros com flag de palpite (sem revelar placar)
    const palpites = await this.palpiteRepo.listarPorJogoEUsuarios(
      jogoId,
      membrosIds,
    );
    const idsQuePalpitaram = new Set(palpites.map((p) => p.usuarioId));

    return membros.map((m) => ({
      id: `status-${m.usuario.id}`,
      usuarioId: m.usuario.id,
      jogoId,
      golsCasa: idsQuePalpitaram.has(m.usuario.id) ? -1 : null,
      golsFora: idsQuePalpitaram.has(m.usuario.id) ? -1 : null,
      dataCriacao: '',
      atualizadoEm: '',
      usuario: { id: m.usuario.id, nome: m.usuario.nome },
    }));
  }

  async buscarEstatisticasPorJogo(jogoId: string, grupoId: string) {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();

    await this.validarJogoPertenceAoGrupo(jogo, grupoId);

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

    // Status de palpite de todos os membros do grupo
    const usuariosQuePalpitaram = new Set(palpites.map((p) => p.usuarioId));
    const palpitaram = membros
      .filter((m) => usuariosQuePalpitaram.has(m.usuario.id))
      .map((m) => m.usuario.nome);
    const membrosStatus = membros.map((m) => ({
      nome: m.usuario.nome,
      palpitou: usuariosQuePalpitaram.has(m.usuario.id),
    }));

    return {
      total,
      vitoriaCasa,
      empate,
      vitoriaFora,
      percentualCasa: total > 0 ? Math.round((vitoriaCasa / total) * 100) : 0,
      percentualEmpate: total > 0 ? Math.round((empate / total) * 100) : 0,
      percentualFora: total > 0 ? Math.round((vitoriaFora / total) * 100) : 0,
      palpitaram,
      membrosStatus,
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

    type ResultadoLote = {
      jogoId: string;
      sucesso: boolean;
      palpite?: Palpite;
      erro?: string;
    };
    const resultados: ResultadoLote[] = new Array(palpites.length);
    const paraCriar: { index: number; item: PalpiteItemDto }[] = [];

    for (const [index, item] of palpites.entries()) {
      const jogo = jogosMap.get(item.jogoId);
      if (!jogo) {
        resultados[index] = {
          jogoId: item.jogoId,
          sucesso: false,
          erro: JOGOS.MENSAGENS.JOGO_NAO_ENCONTRADO,
        };
        continue;
      }
      const status = this.statusEfetivo(jogo.status, jogo.dataHora);
      if (status !== 'AGENDADO' && status !== 'ADIADO') {
        resultados[index] = {
          jogoId: item.jogoId,
          sucesso: false,
          erro: PALPITES.MENSAGENS.JOGO_NAO_ACEITA_PALPITES,
        };
        continue;
      }
      if (jogo.fonteResultado === 'API_EXTERNA' && !jogo.externoId) {
        resultados[index] = {
          jogoId: item.jogoId,
          sucesso: false,
          erro: PALPITES.MENSAGENS.JOGO_PENDENTE_CONFIRMACAO,
        };
        continue;
      }
      if (existentesSet.has(item.jogoId)) {
        resultados[index] = {
          jogoId: item.jogoId,
          sucesso: false,
          erro: PALPITES.MENSAGENS.PALPITE_JA_EXISTE,
        };
        continue;
      }

      existentesSet.add(item.jogoId);
      paraCriar.push({ index, item });
    }

    const criados = await Promise.all(
      paraCriar.map(({ item }) =>
        this.palpiteRepo.criar({
          usuarioId,
          jogoId: item.jogoId,
          golsCasa: item.golsCasa,
          golsFora: item.golsFora,
        }),
      ),
    );

    for (const [criadoIndex, { index, item }] of paraCriar.entries()) {
      resultados[index] = {
        jogoId: item.jogoId,
        sucesso: true,
        palpite: criados[criadoIndex],
      };
    }

    return resultados;
  }

  private async validarJogoPertenceAoGrupo(
    jogo: Pick<Jogo, 'faseId'>,
    grupoId: string,
  ) {
    const grupo = (await this.grupoRepo.buscarPorId(grupoId)) as {
      temporadaId: string;
    } | null;
    if (!grupo) throw new GrupoNaoEncontradoError();

    const fase = await this.faseRepo.buscarPorId(jogo.faseId);
    if (fase?.temporadaId !== grupo.temporadaId) {
      throw new JogoNaoPertenceAoGrupoError();
    }
  }

  private async buscarEValidarOwnership(id: string, usuarioId: string) {
    const palpite = await this.palpiteRepo.buscarPorId(id);
    if (!palpite) throw new PalpiteNaoEncontradoError();
    if (palpite.usuarioId !== usuarioId)
      throw new PalpiteNaoPertenceAoUsuarioError();
    return palpite;
  }

  private statusEfetivo(
    status: string,
    dataHora?: Date | string | null,
  ): string {
    if (status !== 'EM_ANDAMENTO' || !dataHora) return status;
    const inicio = new Date(dataHora).getTime();
    if (Number.isFinite(inicio) && inicio > Date.now()) return 'AGENDADO';
    return status;
  }

  private validarJogoAceitaPalpites(jogo: {
    status: string;
    dataHora?: Date | string | null;
    externoId?: string | null;
    fonteResultado?: string | null;
  }): void {
    const status = this.statusEfetivo(jogo.status, jogo.dataHora);
    if (status !== 'AGENDADO' && status !== 'ADIADO') {
      throw new JogoNaoAceitaPalpitesError();
    }
    // Bloqueia palpites em jogos da API que ainda não foram confirmados (sem externoId)
    if (jogo.fonteResultado === 'API_EXTERNA' && !jogo.externoId) {
      throw new JogoPendenteConfirmacaoError();
    }
  }
}

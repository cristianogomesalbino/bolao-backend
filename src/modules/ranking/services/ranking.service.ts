import { Inject, Injectable, Logger } from '@nestjs/common';
import { PontuacaoService } from './pontuacao.service';
import { TokenDobroService } from '../../palpites/services/token-dobro.service';
import { JOGOS } from '../../jogos/jogos.constants';
import { PALPITES } from '../../palpites/palpites.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import { GRUPO_USUARIO } from '../../grupo-usuario/grupo-usuario.constants';
import { RANKING } from '../ranking.constants';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import type { PalpiteRepository } from '../../palpites/repositories/palpite.repository.interface';
import type { PalpiteDobradoRepository } from '../../palpites/repositories/palpite-dobrado.repository.interface';
import type { GrupoUsuarioRepository } from '../../grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type { TokenDobroRepository } from '../../palpites/repositories/token-dobro.repository.interface';
import {
  GrupoNaoEncontradoError,
  FaseNaoEncontradaError,
  JogoNaoEncontradoError,
  JogoNaoFinalizadoError,
} from '../../../common/errors/domain-errors';

interface RankingEntry {
  posicao: number;
  usuarioId: string;
  nomeUsuario: string;
  pontuacaoTotal: number;
  acertosEmCheio: number;
  acertosDeResultado: number;
  acertosDeGolsUmTime: number;
  errosTotais: number;
}

interface PontuacaoJogoEntry {
  usuarioId: string;
  nomeUsuario: string;
  golsCasaPalpite: number | null;
  golsForaPalpite: number | null;
  categoriaAcerto: string | null;
  pontosBase: number | null;
  multiplicador: number;
  pontosFinais: number | null;
  dobrado: boolean;
}

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(
    private readonly pontuacaoService: PontuacaoService,
    private readonly tokenDobroService: TokenDobroService,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(PALPITES.PALPITE_DOBRADO_REPOSITORY_TOKEN)
    private readonly palpiteDobradoRepo: PalpiteDobradoRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
    @Inject(PALPITES.TOKEN_DOBRO_REPOSITORY_TOKEN)
    private readonly tokenDobroRepo: TokenDobroRepository,
  ) {}

  async obterRankingFase(grupoId: string, faseId: string): Promise<RankingEntry[]> {
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();

    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) throw new FaseNaoEncontradaError();

    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupoId);
    const jogos = await this.jogoRepo.buscarPorFase(faseId);
    const jogosFinalizados = jogos.filter((j: any) => j.status === 'FINALIZADO');

    return this.calcularRanking(membros, jogosFinalizados, grupo);
  }

  async obterRankingGeral(grupoId: string): Promise<RankingEntry[]> {
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();

    const fases = await this.faseRepo.buscarPorTemporada(grupo.temporadaId);
    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupoId);

    const todosJogosFinalizados = await this.buscarJogosFinalizadosDeFases(fases);

    return this.calcularRanking(membros, todosJogosFinalizados, grupo);
  }

  async obterDetalhamentoJogo(grupoId: string, jogoId: string): Promise<PontuacaoJogoEntry[]> {
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();

    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();

    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupoId);
    const usuarioIds = membros.map((m: any) => m.usuarioId);

    const palpites = await this.palpiteRepo.listarPorJogoEUsuarios(jogoId, usuarioIds);
    const palpiteMap = new Map(palpites.map((p: any) => [p.usuarioId, p]));

    const dobrados = await this.palpiteDobradoRepo.listarPorJogosEGrupo([jogoId], grupoId);
    const dobradoSet = new Set(dobrados.map((d: any) => d.usuarioId));

    const jogoFinalizado = jogo.status === 'FINALIZADO';

    return membros.map((membro: any) => {
      const palpite = palpiteMap.get(membro.usuarioId) || null;
      const dobrado = dobradoSet.has(membro.usuarioId);

      if (!jogoFinalizado) {
        return {
          usuarioId: membro.usuarioId,
          nomeUsuario: membro.usuario.nome,
          golsCasaPalpite: palpite?.golsCasa ?? null,
          golsForaPalpite: palpite?.golsFora ?? null,
          categoriaAcerto: null,
          pontosBase: null,
          multiplicador: 1,
          pontosFinais: null,
          dobrado,
        };
      }

      const resultado = this.pontuacaoService.calcular(
        palpite ? { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora } : null,
        { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
      );

      const multiplicador =
        grupo.palpiteDobradoHabilitado && dobrado
          ? RANKING.MULTIPLICADOR_DOBRO
          : 1;

      const pontosFinais = (resultado.pontosBase ?? 0) * multiplicador;

      return {
        usuarioId: membro.usuarioId,
        nomeUsuario: membro.usuario.nome,
        golsCasaPalpite: palpite?.golsCasa ?? null,
        golsForaPalpite: palpite?.golsFora ?? null,
        categoriaAcerto: resultado.categoriaAcerto,
        pontosBase: resultado.pontosBase,
        multiplicador,
        pontosFinais,
        dobrado,
      };
    });
  }

  async processarPontuacaoJogo(jogoId: string): Promise<void> {
    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();
    if (jogo.status !== 'FINALIZADO') throw new JogoNaoFinalizadoError();

    const fase = await this.faseRepo.buscarPorId(jogo.faseId);
    if (!fase) throw new FaseNaoEncontradaError();

    const grupos = await this.grupoRepo.buscarPorTemporadaId(fase.temporadaId);

    for (const grupo of grupos) {
      try {
        await this.processarPontuacaoJogoParaGrupo(jogo, fase, grupo);
      } catch (error) {
        this.logger.error(
          `Erro ao processar pontuação do jogo ${jogoId} para grupo ${grupo.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  async verificarPalpitesCompletos(faseId: string, grupoId: string): Promise<void> {
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo?.palpiteDobradoHabilitado) return;

    const jogos = await this.jogoRepo.buscarPorFase(faseId);
    const jogosNaoCancelados = jogos.filter((j: any) => j.status !== 'CANCELADO');

    if (jogosNaoCancelados.length === 0) return;

    const primeiroJogoDataHora = jogosNaoCancelados
      .map((j: any) => new Date(j.dataHora))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupoId);
    const usuarioIds = membros.map((m: any) => m.usuarioId);
    const jogoIds = jogosNaoCancelados.map((j: any) => j.id);

    const palpites = await this.palpiteRepo.listarPorJogosEUsuarios(jogoIds, usuarioIds);

    const palpitesPorUsuario = new Map<string, any[]>();
    for (const p of palpites) {
      const lista = palpitesPorUsuario.get(p.usuarioId) || [];
      lista.push(p);
      palpitesPorUsuario.set(p.usuarioId, lista);
    }

    for (const membro of membros) {
      const palpitesDoMembro = palpitesPorUsuario.get(membro.usuarioId) || [];

      const todosJogosCobertos = jogoIds.every((jogoId: string) =>
        palpitesDoMembro.some((p: any) => p.jogoId === jogoId),
      );

      if (!todosJogosCobertos) continue;

      const todosPalpitesAntesDoPrimeiroJogo = palpitesDoMembro.every(
        (p: any) => new Date(p.dataCriacao) < primeiroJogoDataHora,
      );

      if (!todosPalpitesAntesDoPrimeiroJogo) continue;

      const tokenExistente = await this.tokenDobroRepo.buscarPorChave(
        membro.usuarioId,
        grupoId,
        'PALPITES_COMPLETOS',
        faseId,
      );

      if (!tokenExistente) {
        await this.tokenDobroService.concederToken(
          membro.usuarioId,
          grupoId,
          'PALPITES_COMPLETOS',
          faseId,
        );
      }
    }
  }

  private async processarPontuacaoJogoParaGrupo(jogo: any, fase: any, grupo: any): Promise<void> {
    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupo.id);
    const usuarioIds = membros.map((m: any) => m.usuarioId);

    const palpites = await this.palpiteRepo.listarPorJogoEUsuarios(jogo.id, usuarioIds);
    const palpiteMap = new Map(palpites.map((p: any) => [p.usuarioId, p]));

    // Conceder TokenDobro por acerto em cheio
    if (grupo.palpiteDobradoHabilitado) {
      await this.concederTokensPorAcertoEmCheio(membros, palpiteMap, jogo, grupo.id);
    }

    // Verificar se a fase encerrou
    const jogosDaFase = await this.jogoRepo.buscarPorFase(fase.id);
    const faseEncerrada = jogosDaFase.every(
      (j: any) => j.status === 'FINALIZADO' || j.status === 'CANCELADO',
    );
    const temJogoFinalizado = jogosDaFase.some((j: any) => j.status === 'FINALIZADO');

    if (faseEncerrada && temJogoFinalizado && grupo.palpiteDobradoHabilitado) {
      await this.concederTokensPorPosicaoRanking(grupo, fase.id);
    }
  }

  private async concederTokensPorAcertoEmCheio(
    membros: any[],
    palpiteMap: Map<string, any>,
    jogo: any,
    grupoId: string,
  ): Promise<void> {
    for (const membro of membros) {
      const palpite = palpiteMap.get(membro.usuarioId);
      if (!palpite) continue;

      const resultado = this.pontuacaoService.calcular(
        { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora },
        { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
      );

      if (resultado.categoriaAcerto !== 'ACERTO_EM_CHEIO') continue;

      const tokenExistente = await this.tokenDobroRepo.buscarPorChave(
        membro.usuarioId,
        grupoId,
        'ACERTO_EM_CHEIO',
        jogo.id,
      );

      if (!tokenExistente) {
        await this.tokenDobroService.concederToken(
          membro.usuarioId,
          grupoId,
          'ACERTO_EM_CHEIO',
          jogo.id,
        );
      }
    }
  }

  private async concederTokensPorPosicaoRanking(grupo: any, faseId: string): Promise<void> {
    const ranking = await this.obterRankingFase(grupo.id, faseId);

    if (ranking.length === 0) return;

    const primeiraPosicao = ranking[0].posicao;
    const ultimaPosicao = ranking.at(-1)?.posicao;

    const primeiros = ranking.filter((r) => r.posicao === primeiraPosicao);
    const ultimos = ranking.filter((r) => r.posicao === ultimaPosicao);

    for (const membro of primeiros) {
      const tokenExistente = await this.tokenDobroRepo.buscarPorChave(
        membro.usuarioId,
        grupo.id,
        'PRIMEIRO_RANKING',
        faseId,
      );

      if (!tokenExistente) {
        await this.tokenDobroService.concederToken(
          membro.usuarioId,
          grupo.id,
          'PRIMEIRO_RANKING',
          faseId,
        );
      }
    }

    for (const membro of ultimos) {
      const tokenExistente = await this.tokenDobroRepo.buscarPorChave(
        membro.usuarioId,
        grupo.id,
        'ULTIMO_RANKING',
        faseId,
      );

      if (!tokenExistente) {
        await this.tokenDobroService.concederToken(
          membro.usuarioId,
          grupo.id,
          'ULTIMO_RANKING',
          faseId,
        );
      }
    }
  }

  private async calcularRanking(
    membros: any[],
    jogosFinalizados: any[],
    grupo: any,
  ): Promise<RankingEntry[]> {
    if (membros.length === 0) return [];

    const usuarioIds = membros.map((m: any) => m.usuarioId);
    const jogoIds = jogosFinalizados.map((j: any) => j.id);

    const palpites = jogoIds.length > 0
      ? await this.palpiteRepo.listarPorJogosEUsuarios(jogoIds, usuarioIds)
      : [];

    const dobrados = jogoIds.length > 0 && grupo.palpiteDobradoHabilitado
      ? await this.palpiteDobradoRepo.listarPorJogosEGrupo(jogoIds, grupo.id)
      : [];

    const palpiteMap = this.buildPalpiteMap(palpites);
    const dobradoSet = this.buildDobradoSet(dobrados);

    const entries: Omit<RankingEntry, 'posicao'>[] = membros.map((membro: any) => {
      let pontuacaoTotal = 0;
      let acertosEmCheio = 0;
      let acertosDeResultado = 0;
      let acertosDeGolsUmTime = 0;
      let errosTotais = 0;

      for (const jogo of jogosFinalizados) {
        const palpite = palpiteMap.get(`${membro.usuarioId}:${jogo.id}`) || null;
        const resultado = this.pontuacaoService.calcular(
          palpite ? { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora } : null,
          { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
        );

        const multiplicador =
          grupo.palpiteDobradoHabilitado && dobradoSet.has(`${membro.usuarioId}:${jogo.id}`)
            ? RANKING.MULTIPLICADOR_DOBRO
            : 1;

        const pontosFinais = (resultado.pontosBase ?? 0) * multiplicador;
        pontuacaoTotal += pontosFinais;

        switch (resultado.categoriaAcerto) {
          case 'ACERTO_EM_CHEIO':
            acertosEmCheio++;
            break;
          case 'ACERTO_DE_RESULTADO':
            acertosDeResultado++;
            break;
          case 'ACERTO_DE_GOLS_UM_TIME':
            acertosDeGolsUmTime++;
            break;
          case 'ERRO_TOTAL':
            errosTotais++;
            break;
        }
      }

      return {
        usuarioId: membro.usuarioId,
        nomeUsuario: membro.usuario.nome,
        pontuacaoTotal,
        acertosEmCheio,
        acertosDeResultado,
        acertosDeGolsUmTime,
        errosTotais,
      };
    });

    return this.ordenarEAtribuirPosicoes(entries);
  }

  private ordenarEAtribuirPosicoes(entries: Omit<RankingEntry, 'posicao'>[]): RankingEntry[] {
    const sorted = [...entries].sort((a, b) => {
      if (b.pontuacaoTotal !== a.pontuacaoTotal) return b.pontuacaoTotal - a.pontuacaoTotal;
      if (b.acertosEmCheio !== a.acertosEmCheio) return b.acertosEmCheio - a.acertosEmCheio;
      if (b.acertosDeResultado !== a.acertosDeResultado) return b.acertosDeResultado - a.acertosDeResultado;
      return a.nomeUsuario.localeCompare(b.nomeUsuario);
    });

    const result: RankingEntry[] = [];
    let posicaoAtual = 1;

    for (let i = 0; i < sorted.length; i++) {
      if (
        i > 0 &&
        sorted[i].pontuacaoTotal === sorted[i - 1].pontuacaoTotal &&
        sorted[i].acertosEmCheio === sorted[i - 1].acertosEmCheio &&
        sorted[i].acertosDeResultado === sorted[i - 1].acertosDeResultado
      ) {
        result.push({ ...sorted[i], posicao: result[i - 1].posicao });
      } else {
        result.push({ ...sorted[i], posicao: posicaoAtual });
      }
      posicaoAtual++;
    }

    return result;
  }

  private buildPalpiteMap(palpites: any[]): Map<string, any> {
    const map = new Map<string, any>();
    for (const p of palpites) {
      map.set(`${p.usuarioId}:${p.jogoId}`, p);
    }
    return map;
  }

  private buildDobradoSet(dobrados: any[]): Set<string> {
    const set = new Set<string>();
    for (const d of dobrados) {
      set.add(`${d.usuarioId}:${d.jogoId}`);
    }
    return set;
  }

  private async buscarJogosFinalizadosDeFases(fases: any[]): Promise<any[]> {
    const todosJogos: any[] = [];
    for (const fase of fases) {
      const jogos = await this.jogoRepo.buscarPorFase(fase.id);
      todosJogos.push(...jogos.filter((j: any) => j.status === 'FINALIZADO'));
    }
    return todosJogos;
  }
}

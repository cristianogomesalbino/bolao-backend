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
  errosTotais: number;
  mediaPalpiteEm: number;
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
  private readonly cache = new Map<string, { dados: RankingEntry[]; expiraEm: number }>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

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

  private obterDoCache(chave: string): RankingEntry[] | null {
    const entrada = this.cache.get(chave);
    if (!entrada) return null;
    if (Date.now() > entrada.expiraEm) {
      this.cache.delete(chave);
      return null;
    }
    return entrada.dados;
  }

  private salvarNoCache(chave: string, dados: RankingEntry[]): void {
    this.cache.set(chave, { dados, expiraEm: Date.now() + RankingService.CACHE_TTL_MS });
  }

  invalidarCache(grupoId: string): void {
    for (const chave of this.cache.keys()) {
      if (chave.startsWith(grupoId)) this.cache.delete(chave);
    }
  }

  async obterRankingFase(grupoId: string, faseId: string, rodada?: number, ateRodada?: number): Promise<RankingEntry[]> {
    const chaveCache = `${grupoId}:fase:${faseId}:r${rodada ?? 'all'}:ate${ateRodada ?? 'all'}`;
    const cacheado = this.obterDoCache(chaveCache);
    if (cacheado) return cacheado;

    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();

    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) throw new FaseNaoEncontradaError();

    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupoId);

    // ateRodada: busca todos os jogos da fase e filtra até a rodada
    // rodada: busca apenas jogos daquela rodada
    const jogos = ateRodada
      ? await this.jogoRepo.buscarPorFase(faseId)
      : await this.jogoRepo.buscarPorFase(faseId, rodada);

    const jogosFinalizados = jogos.filter((j: any) => {
      if (j.status !== 'FINALIZADO') return false;
      if (ateRodada && j.rodada > ateRodada) return false;
      return true;
    });

    const resultado = await this.calcularRanking(membros, jogosFinalizados, grupo);
    this.salvarNoCache(chaveCache, resultado);
    return resultado;
  }

  async obterRankingGeral(grupoId: string): Promise<RankingEntry[]> {
    const chaveCache = `${grupoId}:geral`;
    const cacheado = this.obterDoCache(chaveCache);
    if (cacheado) return cacheado;

    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();

    const fases = await this.faseRepo.buscarPorTemporada(grupo.temporadaId);
    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupoId);

    const todosJogosFinalizados = await this.buscarJogosFinalizadosDeFases(fases);

    const resultado = await this.calcularRanking(membros, todosJogosFinalizados, grupo);
    this.salvarNoCache(chaveCache, resultado);
    return resultado;
  }

  async obterDetalhamentoJogo(grupoId: string, jogoId: string): Promise<PontuacaoJogoEntry[]> {
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupo) throw new GrupoNaoEncontradoError();

    const jogo = await this.jogoRepo.buscarPorId(jogoId);
    if (!jogo) throw new JogoNaoEncontradoError();

    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupoId);
    const usuarioIds = this.extrairUsuarioIds(membros);

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
        grupo.permitirPalpiteDobrado && dobrado
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
    if (!grupo?.permitirPalpiteDobrado) return;

    const jogos = await this.jogoRepo.buscarPorFase(faseId);
    const jogosNaoCancelados = jogos.filter((j: any) => j.status !== 'CANCELADO');

    if (jogosNaoCancelados.length === 0) return;

    const primeiroJogoDataHora = jogosNaoCancelados
      .map((j: any) => new Date(j.dataHora))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupoId);
    const usuarioIds = this.extrairUsuarioIds(membros);
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

      await this.concederTokenSeNaoExiste(membro.usuarioId, grupoId, 'PALPITES_COMPLETOS', faseId);
    }
  }

  private async processarPontuacaoJogoParaGrupo(jogo: any, fase: any, grupo: any): Promise<void> {
    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(grupo.id);
    const usuarioIds = this.extrairUsuarioIds(membros);

    const palpites = await this.palpiteRepo.listarPorJogoEUsuarios(jogo.id, usuarioIds);
    const palpiteMap = new Map(palpites.map((p: any) => [p.usuarioId, p]));

    // Conceder TokenDobro por acerto em cheio
    if (grupo.permitirPalpiteDobrado) {
      await this.concederTokensPorAcertoEmCheio(membros, palpiteMap, jogo, grupo.id);
    }

    // Verificar se a fase encerrou
    const jogosDaFase = await this.jogoRepo.buscarPorFase(fase.id);
    const faseEncerrada = jogosDaFase.every(
      (j: any) => j.status === 'FINALIZADO' || j.status === 'CANCELADO',
    );
    const temJogoFinalizado = jogosDaFase.some((j: any) => j.status === 'FINALIZADO');

    if (faseEncerrada && temJogoFinalizado && grupo.permitirPalpiteDobrado) {
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

      await this.concederTokenSeNaoExiste(membro.usuarioId, grupoId, 'ACERTO_EM_CHEIO', jogo.id);
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
      await this.concederTokenSeNaoExiste(membro.usuarioId, grupo.id, 'PRIMEIRO_RANKING', faseId);
    }

    for (const membro of ultimos) {
      await this.concederTokenSeNaoExiste(membro.usuarioId, grupo.id, 'ULTIMO_RANKING', faseId);
    }
  }

  private async calcularRanking(
    membros: any[],
    jogosFinalizados: any[],
    grupo: any,
  ): Promise<RankingEntry[]> {
    if (membros.length === 0) return [];

    const usuarioIds = this.extrairUsuarioIds(membros);
    const jogoIds = jogosFinalizados.map((j: any) => j.id);

    const palpites = jogoIds.length > 0
      ? await this.palpiteRepo.listarPorJogosEUsuarios(jogoIds, usuarioIds)
      : [];

    const dobrados = jogoIds.length > 0 && grupo.permitirPalpiteDobrado
      ? await this.palpiteDobradoRepo.listarPorJogosEGrupo(jogoIds, grupo.id)
      : [];

    const palpiteMap = this.buildPalpiteMap(palpites);
    const dobradoSet = this.buildDobradoSet(dobrados);

    const entries: Omit<RankingEntry, 'posicao'>[] = membros.map((membro: any) => {
      let pontuacaoTotal = 0;
      let acertosEmCheio = 0;
      let acertosDeResultado = 0;
      let errosTotais = 0;
      let somaTimestamps = 0;
      let totalPalpitesComData = 0;

      for (const jogo of jogosFinalizados) {
        const palpite = palpiteMap.get(`${membro.usuarioId}:${jogo.id}`) || null;
        const resultado = this.pontuacaoService.calcular(
          palpite ? { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora } : null,
          { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
        );

        const multiplicador =
          grupo.permitirPalpiteDobrado && dobradoSet.has(`${membro.usuarioId}:${jogo.id}`)
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
          case 'ERRO_TOTAL':
            errosTotais++;
            break;
        }

        if (palpite?.dataCriacao) {
          somaTimestamps += new Date(palpite.dataCriacao).getTime();
          totalPalpitesComData++;
        }
      }

      const mediaPalpiteEm = totalPalpitesComData > 0
        ? somaTimestamps / totalPalpitesComData
        : Number.MAX_SAFE_INTEGER;

      return {
        usuarioId: membro.usuarioId,
        nomeUsuario: membro.usuario.nome,
        pontuacaoTotal,
        acertosEmCheio,
        acertosDeResultado,
        errosTotais,
        mediaPalpiteEm,
      };
    });

    return this.ordenarEAtribuirPosicoes(entries);
  }

  private ordenarEAtribuirPosicoes(entries: Omit<RankingEntry, 'posicao'>[]): RankingEntry[] {
    const sorted = [...entries].sort((a, b) => {
      if (b.pontuacaoTotal !== a.pontuacaoTotal) return b.pontuacaoTotal - a.pontuacaoTotal;
      if (b.acertosEmCheio !== a.acertosEmCheio) return b.acertosEmCheio - a.acertosEmCheio;
      if (b.acertosDeResultado !== a.acertosDeResultado) return b.acertosDeResultado - a.acertosDeResultado;
      if (a.mediaPalpiteEm !== b.mediaPalpiteEm) return a.mediaPalpiteEm - b.mediaPalpiteEm;
      return a.nomeUsuario.localeCompare(b.nomeUsuario);
    });

    return sorted.map((entry, i) => ({ ...entry, posicao: i + 1 }));
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

  private extrairUsuarioIds(membros: any[]): string[] {
    return membros.map((m: any) => m.usuarioId);
  }

  private async concederTokenSeNaoExiste(
    usuarioId: string,
    grupoId: string,
    motivo: 'PALPITES_COMPLETOS' | 'ACERTO_EM_CHEIO' | 'ULTIMO_RANKING' | 'PRIMEIRO_RANKING',
    referenciaId: string,
  ): Promise<void> {
    const tokenExistente = await this.tokenDobroRepo.buscarPorChave(
      usuarioId,
      grupoId,
      motivo,
      referenciaId,
    );
    if (!tokenExistente) {
      await this.tokenDobroService.concederToken(usuarioId, grupoId, motivo, referenciaId);
    }
  }
}

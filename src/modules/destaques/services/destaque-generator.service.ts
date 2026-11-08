import { Inject, Injectable, Logger } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import { PALPITES } from '../../palpites/palpites.constants';
import { PontuacaoService } from '../../ranking/services/pontuacao.service';
import {
  RankingService,
  type RankingEntry,
} from '../../ranking/services/ranking.service';
import { DestaquePorMembroService } from './destaque-por-membro.service';
import type {
  DestaqueRepository,
  CriarDestaqueData,
} from '../repositories/destaque.repository.interface';
import type {
  RankingSnapshotRepository,
  UpsertSnapshotData,
} from '../repositories/ranking-snapshot.repository.interface';
import type { PalpiteRepository } from '../../palpites/repositories/palpite.repository.interface';
import type { PalpiteDobradoRepository } from '../../palpites/repositories/palpite-dobrado.repository.interface';
import type {
  JogoComTimes,
  GrupoBasico,
  MembroComUsuario,
} from '../types/destaque.types';
import type {
  GeracaoContexto,
  ResultadoMembro,
} from './destaque-geracao.contexto';

@Injectable()
export class DestaqueGeneratorService {
  private readonly logger = new Logger(DestaqueGeneratorService.name);

  constructor(
    @Inject(DESTAQUES.DESTAQUE_REPOSITORY_TOKEN)
    private readonly destaqueRepo: DestaqueRepository,
    @Inject(DESTAQUES.RANKING_SNAPSHOT_REPOSITORY_TOKEN)
    private readonly snapshotRepo: RankingSnapshotRepository,
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(PALPITES.PALPITE_DOBRADO_REPOSITORY_TOKEN)
    private readonly palpiteDobradoRepo: PalpiteDobradoRepository,
    private readonly pontuacaoService: PontuacaoService,
    private readonly rankingService: RankingService,
    private readonly destaquePorMembro: DestaquePorMembroService,
  ) {}

  async gerarDestaquesParaGrupo(
    jogo: JogoComTimes,
    grupo: GrupoBasico,
    membros: MembroComUsuario[],
  ): Promise<number> {
    const ctx = await this.construirContexto(jogo, grupo, membros);
    await this.carregarTitulosUsadosNaRodada(ctx);
    const destaquesParaCriar: CriarDestaqueData[] = [];

    for (const membro of membros) {
      try {
        const destaques = await this.destaquePorMembro.gerarParaMembro(
          membro,
          ctx,
        );
        destaquesParaCriar.push(...destaques);
      } catch (error) {
        this.logger.error(
          `Erro ao gerar destaques para membro ${membro.usuarioId} no grupo ${grupo.id}: ${(error as Error).message}`,
        );
      }
    }

    if (destaquesParaCriar.length > 0) {
      await this.destaqueRepo.criarVarios(destaquesParaCriar);
    }

    await this.salvarSnapshotAtual(
      grupo.id,
      jogo.faseId,
      jogo.rodada,
      ctx.rankingDepois,
    );
    return destaquesParaCriar.length;
  }

  private async construirContexto(
    jogo: JogoComTimes,
    grupo: GrupoBasico,
    membros: MembroComUsuario[],
  ): Promise<GeracaoContexto> {
    const usuarioIds = membros.map((m) => m.usuarioId);

    const palpites = await this.palpiteRepo.listarPorJogoEUsuarios(
      jogo.id,
      usuarioIds,
    );
    const palpiteMap = new Map<string, { golsCasa: number; golsFora: number }>(
      (
        palpites as Array<{
          usuarioId: string;
          golsCasa: number;
          golsFora: number;
        }>
      ).map((p) => [p.usuarioId, p]),
    );

    const dobrados = grupo.permitirPalpiteDobrado
      ? await this.palpiteDobradoRepo.listarPorJogosEGrupo([jogo.id], grupo.id)
      : [];
    const dobradoSet = new Set(
      dobrados.map((d: { usuarioId: string }) => d.usuarioId),
    );

    const resultados = this.calcularResultadosMembros(
      membros,
      palpiteMap,
      jogo,
    );
    const membrosNaMosca = resultados.filter(
      (r) => r.categoriaAcerto === 'ACERTO_EM_CHEIO',
    );
    const [rankingAntes, rankingDepois] = await this.rankingsDaRodada(
      grupo.id,
      jogo,
    );
    const posicaoAnteriorMap = new Map(
      rankingAntes.map((r) => [r.usuarioId, r.posicao]),
    );
    const rankingAtual = new Map(
      rankingDepois.map((r) => [r.usuarioId, r.posicao]),
    );

    return {
      jogo,
      grupo,
      palpiteMap,
      dobradoSet,
      membrosNaMosca,
      unicoNaMosca: membrosNaMosca.length === 1,
      posicaoAnteriorMap,
      rankingAtual,
      rankingDepois,
      top5: rankingDepois
        .slice(0, DESTAQUES.LIMITES.SUBIU_RANKING_TOP)
        .map((r) => ({
          posicao: r.posicao,
          nome: r.nomeUsuario,
          pontuacao: r.pontuacaoTotal,
        })),
      resultados,
      ultimoTituloPorTipo: new Map(),
      titulosUsadosPorTipo: new Map(),
    };
  }

  private async carregarTitulosUsadosNaRodada(
    ctx: GeracaoContexto,
  ): Promise<void> {
    if (ctx.jogo.rodada == null) return;
    const existentes = await this.destaqueRepo.buscarPorGrupoERodadas(
      ctx.grupo.id,
      [ctx.jogo.rodada],
      DESTAQUES.LIMITES.BUSCA_LISTAGEM,
    );
    for (const destaque of existentes) {
      const usados =
        ctx.titulosUsadosPorTipo.get(destaque.tipo) ?? new Set<string>();
      usados.add(destaque.titulo);
      ctx.titulosUsadosPorTipo.set(destaque.tipo, usados);
    }
  }

  private async rankingsDaRodada(
    grupoId: string,
    jogo: JogoComTimes,
  ): Promise<[RankingEntry[], RankingEntry[]]> {
    if (jogo.rodada == null) return [[], []];

    const encerrada = await this.rankingService.rodadaEncerrada(
      jogo.faseId,
      jogo.rodada,
    );
    if (!encerrada) return [[], []];

    const rodadaAnterior = jogo.rodada - 1;
    const rankingAntes =
      rodadaAnterior >= 1
        ? await this.obterRankingAnterior(grupoId, jogo.faseId, rodadaAnterior)
        : [];
    const rankingDepois = await this.rankingService.calcularRankingAteRodada(
      grupoId,
      jogo.faseId,
      jogo.rodada,
    );
    return [rankingAntes, rankingDepois];
  }

  /** Prefere snapshot gravado; recalcula só se ainda não houver leitor. */
  private async obterRankingAnterior(
    grupoId: string,
    faseId: string,
    rodadaAnterior: number,
  ): Promise<RankingEntry[]> {
    const snapshots = await this.snapshotRepo.buscarPorGrupoFaseRodada(
      grupoId,
      faseId,
      rodadaAnterior,
    );
    if (snapshots.length > 0) {
      return snapshots
        .map((s) => ({
          posicao: s.posicao,
          usuarioId: s.usuarioId,
          nomeUsuario: '',
          pontuacaoTotal: s.pontuacao,
          acertosEmCheio: 0,
          acertosDeResultado: 0,
          errosTotais: 0,
          mediaPalpiteEm: 0,
        }))
        .sort((a, b) => a.posicao - b.posicao);
    }

    return this.rankingService.calcularRankingAteRodada(
      grupoId,
      faseId,
      rodadaAnterior,
    );
  }

  private calcularResultadosMembros(
    membros: MembroComUsuario[],
    palpiteMap: Map<string, { golsCasa: number; golsFora: number }>,
    jogo: JogoComTimes,
  ): ResultadoMembro[] {
    return membros.map((m) => {
      const palpite = palpiteMap.get(m.usuarioId) ?? null;
      const resultado = this.pontuacaoService.calcular(palpite, {
        golsCasa: jogo.golsCasa!,
        golsFora: jogo.golsFora!,
      });
      return {
        usuarioId: m.usuarioId,
        nomeUsuario: m.usuario.nome,
        categoriaAcerto: resultado.categoriaAcerto,
        pontosBase: resultado.pontosBase,
      };
    });
  }

  private async salvarSnapshotAtual(
    grupoId: string,
    faseId: string,
    rodada: number | null,
    rankingDepois: RankingEntry[],
  ): Promise<void> {
    const dados: UpsertSnapshotData[] = rankingDepois.map((r) => ({
      grupoId,
      usuarioId: r.usuarioId,
      faseId,
      rodada,
      posicao: r.posicao,
      pontuacao: r.pontuacaoTotal,
    }));
    if (dados.length > 0) {
      await this.snapshotRepo.upsertBatch(dados);
    }
  }
}

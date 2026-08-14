import { Inject, Injectable, Logger } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import { PALPITES } from '../../palpites/palpites.constants';
import { PontuacaoService } from '../../ranking/services/pontuacao.service';
import { DestaqueSequenciaService } from './destaque-sequencia.service';
import { pickRandomTitle } from '../destaques.titulos';
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
  TipoDestaque,
  JogoComTimes,
  GrupoBasico,
  MembroComUsuario,
  DadosAcertouEmCheio,
  DadosUnicoNaMosca,
  DadosSubiuRanking,
  DadosNaoPalpitou,
  DadosDobrouEAcertou,
  TimeInfo,
} from '../types/destaque.types';

interface ResultadoMembro {
  usuarioId: string;
  nomeUsuario: string;
  categoriaAcerto: string | null;
  pontosBase: number;
}

interface GeracaoContexto {
  jogo: JogoComTimes;
  grupo: GrupoBasico;
  palpiteMap: Map<string, { golsCasa: number; golsFora: number }>;
  dobradoSet: Set<string>;
  membrosNaMosca: ResultadoMembro[];
  unicoNaMosca: boolean;
  posicaoAnteriorMap: Map<string, number>;
  rankingAtual: Map<string, number>;
  resultados: ResultadoMembro[];
  ultimoTituloPorTipo: Map<TipoDestaque, string>;
}

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
    private readonly sequenciaService: DestaqueSequenciaService,
  ) {}

  async gerarDestaquesParaGrupo(
    jogo: JogoComTimes,
    grupo: GrupoBasico,
    membros: MembroComUsuario[],
  ): Promise<number> {
    const ctx = await this.construirContexto(jogo, grupo, membros);
    const destaquesParaCriar: CriarDestaqueData[] = [];

    for (const membro of membros) {
      try {
        const destaques = await this.avaliarMembro(membro, ctx);
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
      ctx.rankingAtual,
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

    const snapshotsAnteriores =
      await this.snapshotRepo.buscarPorGrupoFaseRodada(
        grupo.id,
        jogo.faseId,
        this.calcularRodadaAnterior(jogo.rodada),
      );
    const posicaoAnteriorMap = new Map(
      snapshotsAnteriores.map((s) => [s.usuarioId, s.posicao]),
    );

    const resultados = this.calcularResultadosMembros(
      membros,
      palpiteMap,
      jogo,
    );
    const membrosNaMosca = resultados.filter(
      (r) => r.categoriaAcerto === 'ACERTO_EM_CHEIO',
    );
    const rankingAtual = this.calcularRankingSimples(resultados);

    return {
      jogo,
      grupo,
      palpiteMap,
      dobradoSet,
      membrosNaMosca,
      unicoNaMosca: membrosNaMosca.length === 1,
      posicaoAnteriorMap,
      rankingAtual,
      resultados,
      ultimoTituloPorTipo: new Map(),
    };
  }

  private async avaliarMembro(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
  ): Promise<CriarDestaqueData[]> {
    const palpite = ctx.palpiteMap.get(membro.usuarioId);

    if (!palpite) {
      return this.avaliarNaoPalpitou(membro, ctx);
    }

    const resultado = ctx.resultados.find(
      (r) => r.usuarioId === membro.usuarioId,
    );
    if (!resultado) return [];

    const destaques: CriarDestaqueData[] = [];
    this.avaliarAcerto(membro, resultado, ctx, destaques);
    this.avaliarSubiuRanking(membro, ctx, destaques);
    this.avaliarDobrouEAcertou(membro, resultado, ctx, destaques);
    await this.avaliarSequencias(membro, ctx, destaques);
    return destaques;
  }

  private async avaliarNaoPalpitou(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
  ): Promise<CriarDestaqueData[]> {
    const jaExiste = await this.destaqueRepo.existeDestaque(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.id,
      'NAO_PALPITOU',
    );
    if (jaExiste) return [];

    return [
      this.buildDestaque('NAO_PALPITOU', membro, ctx, {
        jogosEsquecidos: [this.buildJogoEsquecido(ctx.jogo)],
        totalJogosRodada: 1,
        rodada: ctx.jogo.rodada,
      } satisfies DadosNaoPalpitou),
    ];
  }

  private avaliarAcerto(
    membro: MembroComUsuario,
    resultado: ResultadoMembro,
    ctx: GeracaoContexto,
    destaques: CriarDestaqueData[],
  ): void {
    const timeCasaInfo = this.buildTimeInfo(ctx.jogo.timeCasa);
    const timeForaInfo = this.buildTimeInfo(ctx.jogo.timeFora);

    const ehUnico =
      ctx.unicoNaMosca && ctx.membrosNaMosca[0].usuarioId === membro.usuarioId;

    if (ehUnico) {
      destaques.push(
        this.buildDestaque('UNICO_NA_MOSCA', membro, ctx, {
          golsCasa: ctx.jogo.golsCasa!,
          golsFora: ctx.jogo.golsFora!,
          timeCasa: timeCasaInfo,
          timeFora: timeForaInfo,
          rodada: ctx.jogo.rodada,
        } satisfies DadosUnicoNaMosca),
      );
      return;
    }

    if (resultado.categoriaAcerto === 'ACERTO_EM_CHEIO') {
      destaques.push(
        this.buildDestaque('ACERTOU_EM_CHEIO', membro, ctx, {
          golsCasa: ctx.jogo.golsCasa!,
          golsFora: ctx.jogo.golsFora!,
          timeCasa: timeCasaInfo,
          timeFora: timeForaInfo,
        } satisfies DadosAcertouEmCheio),
      );
    }
  }

  private avaliarSubiuRanking(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
    destaques: CriarDestaqueData[],
  ): void {
    const posicaoNova = ctx.rankingAtual.get(membro.usuarioId);
    const posicaoAnterior = ctx.posicaoAnteriorMap.get(membro.usuarioId);
    if (!posicaoNova || !posicaoAnterior) return;

    const subiu = posicaoAnterior - posicaoNova;
    const dentroDoTop5 = posicaoNova <= DESTAQUES.LIMITES.SUBIU_RANKING_TOP;
    const subiuSuficiente =
      subiu >= DESTAQUES.LIMITES.SUBIU_RANKING_MINIMO ||
      (subiu >= 1 && dentroDoTop5);

    if (!subiuSuficiente) return;

    destaques.push(
      this.buildDestaque('SUBIU_RANKING', membro, ctx, {
        posicaoAnterior,
        posicaoNova,
        top5: this.buildTop5(ctx.resultados, ctx.rankingAtual),
      } satisfies DadosSubiuRanking),
    );
  }

  private avaliarDobrouEAcertou(
    membro: MembroComUsuario,
    resultado: ResultadoMembro,
    ctx: GeracaoContexto,
    destaques: CriarDestaqueData[],
  ): void {
    const dobrou = ctx.dobradoSet.has(membro.usuarioId);
    const acertou =
      resultado.categoriaAcerto !== null &&
      resultado.categoriaAcerto !== 'ERRO_TOTAL';
    if (!dobrou || !acertou) return;

    destaques.push(
      this.buildDestaque('DOBROU_E_ACERTOU', membro, ctx, {
        golsCasa: ctx.jogo.golsCasa!,
        golsFora: ctx.jogo.golsFora!,
        timeCasa: this.buildTimeInfo(ctx.jogo.timeCasa),
        timeFora: this.buildTimeInfo(ctx.jogo.timeFora),
        pontosObtidos: resultado.pontosBase * 2,
      } satisfies DadosDobrouEAcertou),
    );
  }

  private async avaliarSequencias(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
    destaques: CriarDestaqueData[],
  ): Promise<void> {
    const seqMosca = await this.sequenciaService.calcularSequenciaMosca(
      membro.usuarioId,
      ctx.jogo.faseId,
      ctx.jogo.rodada,
      ctx.jogo.id,
    );
    if (seqMosca) {
      const recorde = await this.sequenciaService.atualizarRecorde(
        ctx.grupo.id,
        ctx.grupo.temporadaId,
        'MOSCA',
        membro.usuarioId,
        seqMosca.quantidade,
      );
      destaques.push(
        this.buildDestaque('SEQUENCIA_MOSCA', membro, ctx, {
          quantidadeAcertos: seqMosca.quantidade,
          ultimosJogos: seqMosca.ultimosJogos.map((j) => ({
            ...j,
            acertouEmCheio: true,
          })),
          recorde,
        }),
      );
    }

    const seqResultado = await this.sequenciaService.calcularSequenciaResultado(
      membro.usuarioId,
      ctx.jogo.faseId,
      ctx.jogo.rodada,
      ctx.jogo.id,
    );
    if (seqResultado) {
      const recorde = await this.sequenciaService.atualizarRecorde(
        ctx.grupo.id,
        ctx.grupo.temporadaId,
        'RESULTADO',
        membro.usuarioId,
        seqResultado.quantidade,
      );
      destaques.push(
        this.buildDestaque('SEQUENCIA_RESULTADO', membro, ctx, {
          quantidadeAcertos: seqResultado.quantidade,
          rodadaInicio: seqResultado.rodadaInicio,
          rodadaFim: ctx.jogo.rodada,
          ultimosJogos: seqResultado.ultimosJogos,
          recorde,
        }),
      );
    }
  }

  // --- Helpers ---

  private buildDestaque(
    tipo: TipoDestaque,
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
    dados: Record<string, unknown>,
  ): CriarDestaqueData {
    const destaqueTitle = pickRandomTitle(tipo, ctx.ultimoTituloPorTipo.get(tipo));
    ctx.ultimoTituloPorTipo.set(tipo, destaqueTitle.id);

    return {
      grupoId: ctx.grupo.id,
      usuarioId: membro.usuarioId,
      jogoId: ctx.jogo.id,
      rodada: ctx.jogo.rodada,
      tipo,
      dados,
      titulo: destaqueTitle.title,
    };
  }

  private buildTimeInfo(time: {
    nome: string;
    sigla: string;
    escudo: string | null;
  }): TimeInfo {
    return { nome: time.nome, sigla: time.sigla, escudo: time.escudo };
  }

  private buildJogoEsquecido(jogo: JogoComTimes) {
    return {
      jogoId: jogo.id,
      timeCasa: this.buildTimeInfo(jogo.timeCasa),
      timeFora: this.buildTimeInfo(jogo.timeFora),
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
    };
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

  private calcularRankingSimples(
    resultados: ResultadoMembro[],
  ): Map<string, number> {
    const sorted = [...resultados].sort((a, b) => b.pontosBase - a.pontosBase);
    const posicoes = new Map<string, number>();
    sorted.forEach((r, i) => posicoes.set(r.usuarioId, i + 1));
    return posicoes;
  }

  private buildTop5(
    resultados: ResultadoMembro[],
    rankingAtual: Map<string, number>,
  ): Array<{ posicao: number; nome: string; pontuacao: number }> {
    return resultados
      .map((r) => ({
        posicao: rankingAtual.get(r.usuarioId) ?? 99,
        nome: r.nomeUsuario,
        pontuacao: r.pontosBase,
      }))
      .sort((a, b) => a.posicao - b.posicao)
      .slice(0, 5);
  }

  private calcularRodadaAnterior(rodadaAtual: number | null): number | null {
    if (rodadaAtual === null || rodadaAtual <= 1) return null;
    return rodadaAtual - 1;
  }

  private async salvarSnapshotAtual(
    grupoId: string,
    faseId: string,
    rodada: number | null,
    rankingAtual: Map<string, number>,
  ): Promise<void> {
    const dados: UpsertSnapshotData[] = [];
    for (const [usuarioId, posicao] of rankingAtual.entries()) {
      dados.push({ grupoId, usuarioId, faseId, rodada, posicao, pontuacao: 0 });
    }
    if (dados.length > 0) {
      await this.snapshotRepo.upsertBatch(dados);
    }
  }
}

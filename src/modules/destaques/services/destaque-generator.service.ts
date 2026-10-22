import { Inject, Injectable, Logger } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import { PALPITES } from '../../palpites/palpites.constants';
import { PontuacaoService } from '../../ranking/services/pontuacao.service';
import {
  RankingService,
  type RankingEntry,
} from '../../ranking/services/ranking.service';
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
  DadosSequenciaResultado,
  PlacarCravado,
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
  rankingDepois: RankingEntry[];
  top5: Array<{ posicao: number; nome: string; pontuacao: number }>;
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
    private readonly rankingService: RankingService,
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
      top5: rankingDepois.slice(0, DESTAQUES.LIMITES.SUBIU_RANKING_TOP).map((r) => ({
        posicao: r.posicao,
        nome: r.nomeUsuario,
        pontuacao: r.pontuacaoTotal,
      })),
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
      const esquecidos = await this.avaliarNaoPalpitou(membro, ctx);
      await this.avaliarSubiuRanking(membro, ctx, esquecidos);
      return esquecidos;
    }

    const resultado = ctx.resultados.find(
      (r) => r.usuarioId === membro.usuarioId,
    );
    if (!resultado) return [];

    const destaques: CriarDestaqueData[] = [];
    await this.avaliarAcerto(membro, resultado, ctx, destaques);
    await this.avaliarSubiuRanking(membro, ctx, destaques);
    this.avaliarDobrouEAcertou(membro, resultado, ctx, destaques);
    await this.avaliarSequencias(membro, resultado, ctx, destaques);
    return destaques;
  }

  private async avaliarNaoPalpitou(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
  ): Promise<CriarDestaqueData[]> {
    if (ctx.jogo.rodada === null) {
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

    const lista = await this.sequenciaService.listarEsquecidosDaRodada(
      membro.usuarioId,
      ctx.grupo.temporadaId,
      ctx.jogo.rodada,
    );
    const atual = this.buildJogoEsquecido(ctx.jogo);
    const jogosEsquecidos = lista.some((jogo) => jogo.jogoId === ctx.jogo.id)
      ? lista
      : [...lista, atual];
    const dados: DadosNaoPalpitou = {
      jogosEsquecidos,
      totalJogosRodada: jogosEsquecidos.length,
      rodada: ctx.jogo.rodada,
    };

    const existente = await this.destaqueRepo.buscarNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      'NAO_PALPITOU',
    );
    if (existente) {
      await this.destaqueRepo.atualizar(existente.id, {
        dados,
        titulo: existente.titulo,
      });
      await this.destaqueRepo.removerPorTiposNaRodada(
        ctx.grupo.id,
        membro.usuarioId,
        ctx.jogo.rodada,
        ['NAO_PALPITOU'],
        existente.id,
      );
      return [];
    }

    return [this.buildDestaque('NAO_PALPITOU', membro, ctx, dados)];
  }

  private async avaliarAcerto(
    membro: MembroComUsuario,
    resultado: ResultadoMembro,
    ctx: GeracaoContexto,
    destaques: CriarDestaqueData[],
  ): Promise<void> {
    if (resultado.categoriaAcerto !== 'ACERTO_EM_CHEIO') return;
    if (ctx.jogo.rodada === null || ctx.jogo.golsCasa === null || ctx.jogo.golsFora === null) {
      return;
    }

    const cravadas = await this.sequenciaService.listarCravadasDaRodada(
      membro.usuarioId,
      ctx.grupo.temporadaId,
      ctx.jogo.rodada,
    );
    const atual: PlacarCravado = {
      jogoId: ctx.jogo.id,
      golsCasa: ctx.jogo.golsCasa,
      golsFora: ctx.jogo.golsFora,
      timeCasa: this.buildTimeInfo(ctx.jogo.timeCasa),
      timeFora: this.buildTimeInfo(ctx.jogo.timeFora),
    };
    const lista = cravadas.some((jogo) => jogo.jogoId === ctx.jogo.id)
      ? cravadas
      : [...cravadas, atual];

    const unicoDesteJogo =
      lista.length === 1 &&
      ctx.unicoNaMosca &&
      ctx.membrosNaMosca[0]?.usuarioId === membro.usuarioId;

    if (unicoDesteJogo) {
      await this.destaqueRepo.removerPorTiposNaRodada(
        ctx.grupo.id,
        membro.usuarioId,
        ctx.jogo.rodada,
        ['ACERTOU_EM_CHEIO', 'SEQUENCIA_MOSCA'],
      );
      const jaTemUnico = await this.destaqueRepo.existeDestaque(
        ctx.grupo.id,
        membro.usuarioId,
        ctx.jogo.id,
        'UNICO_NA_MOSCA',
      );
      if (!jaTemUnico) {
        destaques.push(
          this.buildDestaque('UNICO_NA_MOSCA', membro, ctx, {
            golsCasa: atual.golsCasa,
            golsFora: atual.golsFora,
            timeCasa: atual.timeCasa,
            timeFora: atual.timeFora,
            rodada: ctx.jogo.rodada,
          } satisfies DadosUnicoNaMosca),
        );
      }
      return;
    }

    await this.destaqueRepo.removerPorTiposNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      ['UNICO_NA_MOSCA', 'SEQUENCIA_MOSCA'],
    );

    const dados = this.dadosDoAcerto(lista);
    const existente = await this.destaqueRepo.buscarNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      'ACERTOU_EM_CHEIO',
    );
    if (existente) {
      const titulo = pickRandomTitle(
        'ACERTOU_EM_CHEIO',
        ctx.ultimoTituloPorTipo.get('ACERTOU_EM_CHEIO'),
      );
      ctx.ultimoTituloPorTipo.set('ACERTOU_EM_CHEIO', titulo.id);
      await this.destaqueRepo.atualizar(existente.id, { dados, titulo: titulo.title });
      await this.destaqueRepo.removerPorTiposNaRodada(
        ctx.grupo.id,
        membro.usuarioId,
        ctx.jogo.rodada,
        ['ACERTOU_EM_CHEIO'],
        existente.id,
      );
      return;
    }

    destaques.push(this.buildDestaque('ACERTOU_EM_CHEIO', membro, ctx, dados));
  }

  private dadosDoAcerto(lista: PlacarCravado[]): DadosAcertouEmCheio {
    const principal = lista[lista.length - 1];
    return {
      golsCasa: principal.golsCasa,
      golsFora: principal.golsFora,
      timeCasa: principal.timeCasa,
      timeFora: principal.timeFora,
      ...(lista.length > 1 ? { jogos: lista } : {}),
    };
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
    return Promise.all([
      rodadaAnterior >= 1
        ? this.rankingService.calcularRankingAteRodada(
            grupoId,
            jogo.faseId,
            rodadaAnterior,
          )
        : Promise.resolve([]),
      this.rankingService.calcularRankingAteRodada(
        grupoId,
        jogo.faseId,
        jogo.rodada,
      ),
    ]);
  }

  private async avaliarSubiuRanking(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
    destaques: CriarDestaqueData[],
  ): Promise<void> {
    if (ctx.jogo.rodada == null) return;

    const posicaoNova = ctx.rankingAtual.get(membro.usuarioId);
    const posicaoAnterior = ctx.posicaoAnteriorMap.get(membro.usuarioId);
    if (!posicaoNova || !posicaoAnterior) return;

    const subiu = posicaoAnterior - posicaoNova;
    const dentroDoTop5 = posicaoNova <= DESTAQUES.LIMITES.SUBIU_RANKING_TOP;
    const subiuSuficiente =
      subiu >= DESTAQUES.LIMITES.SUBIU_RANKING_MINIMO ||
      (subiu >= 1 && dentroDoTop5);

    if (!subiuSuficiente) return;

    const jaExisteNaRodada = await this.destaqueRepo.existeDestaqueNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      'SUBIU_RANKING',
    );
    if (jaExisteNaRodada) return;

    destaques.push(
      this.buildDestaque('SUBIU_RANKING', membro, ctx, {
        posicaoAnterior,
        posicaoNova,
        top5: ctx.top5,
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
    resultado: ResultadoMembro,
    ctx: GeracaoContexto,
    destaques: CriarDestaqueData[],
  ): Promise<void> {
    if (ctx.jogo.rodada === null) return;

    await this.destaqueRepo.removerPorTiposNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      ['SEQUENCIA_MOSCA'],
    );

    if (resultado.pontosBase <= 0) {
      await this.descartarSequenciaCurta(membro, ctx);
      return;
    }

    const seqResultado = await this.sequenciaService.calcularSequenciaResultado(
      membro.usuarioId,
      ctx.jogo.faseId,
      ctx.jogo.rodada,
      ctx.jogo.id,
    );
    if (!seqResultado || seqResultado.pontos < DESTAQUES.LIMITES.SEQUENCIA_PONTOS_MINIMOS) {
      await this.descartarSequenciaCurta(membro, ctx);
      return;
    }

    const recorde = await this.sequenciaService.atualizarRecorde(
      ctx.grupo.id,
      ctx.grupo.temporadaId,
      'RESULTADO',
      membro.usuarioId,
      seqResultado.quantidade,
    );
    const dados: DadosSequenciaResultado = {
      quantidadeAcertos: seqResultado.quantidade,
      pontos: seqResultado.pontos,
      rodadaInicio: seqResultado.rodadaInicio,
      rodadaFim: ctx.jogo.rodada,
      ultimosJogos: seqResultado.ultimosJogos,
      recorde,
    };

    const existente = await this.destaqueRepo.buscarNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      'SEQUENCIA_RESULTADO',
    );
    if (existente) {
      const pontosAtuais = Number(existente.dados.pontos ?? 0);
      if (pontosAtuais > seqResultado.pontos) return;

      const titulo = pickRandomTitle(
        'SEQUENCIA_RESULTADO',
        ctx.ultimoTituloPorTipo.get('SEQUENCIA_RESULTADO'),
      );
      ctx.ultimoTituloPorTipo.set('SEQUENCIA_RESULTADO', titulo.id);
      await this.destaqueRepo.atualizar(existente.id, { dados, titulo: titulo.title });
      await this.destaqueRepo.removerPorTiposNaRodada(
        ctx.grupo.id,
        membro.usuarioId,
        ctx.jogo.rodada,
        ['SEQUENCIA_RESULTADO'],
        existente.id,
      );
      return;
    }

    destaques.push(this.buildDestaque('SEQUENCIA_RESULTADO', membro, ctx, dados));
  }

  private async descartarSequenciaCurta(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
  ): Promise<void> {
    if (ctx.jogo.rodada === null) return;
    const existente = await this.destaqueRepo.buscarNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      'SEQUENCIA_RESULTADO',
    );
    const pontos = Number(existente?.dados.pontos ?? 0);
    if (!existente || pontos >= DESTAQUES.LIMITES.SEQUENCIA_PONTOS_MINIMOS) return;
    await this.destaqueRepo.removerPorTiposNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      ['SEQUENCIA_RESULTADO'],
    );
  }

  // --- Helpers ---

  private buildDestaque(
    tipo: Exclude<TipoDestaque, 'SEQUENCIA_MOSCA'>,
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
    dados: object,
  ): CriarDestaqueData {
    const destaqueTitle = pickRandomTitle(
      tipo,
      ctx.ultimoTituloPorTipo.get(tipo),
    );
    ctx.ultimoTituloPorTipo.set(tipo, destaqueTitle.id);

    return {
      grupoId: ctx.grupo.id,
      usuarioId: membro.usuarioId,
      jogoId: ctx.jogo.id,
      rodada: ctx.jogo.rodada,
      tipo,
      dados: dados as Record<string, unknown>,
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

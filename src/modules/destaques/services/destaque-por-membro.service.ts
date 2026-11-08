import { Inject, Injectable } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import { inferirGeneroPorNome, pickRandomTitle } from '../destaques.titulos';
import type {
  CriarDestaqueData,
  DestaqueRepository,
} from '../repositories/destaque.repository.interface';
import { DestaqueSequenciaService } from './destaque-sequencia.service';
import { DestaqueAcertoService } from './destaque-acerto.service';
import type {
  GeracaoContexto,
  ResultadoMembro,
} from './destaque-geracao.contexto';
import type {
  TipoDestaque,
  MembroComUsuario,
  DadosSubiuRanking,
  DadosDobrouEAcertou,
  DadosSequenciaResultado,
  TimeInfo,
} from '../types/destaque.types';

@Injectable()
export class DestaquePorMembroService {
  constructor(
    @Inject(DESTAQUES.DESTAQUE_REPOSITORY_TOKEN)
    private readonly destaqueRepo: DestaqueRepository,
    private readonly sequenciaService: DestaqueSequenciaService,
    private readonly destaqueAcerto: DestaqueAcertoService,
  ) {}

  async gerarParaMembro(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
  ): Promise<CriarDestaqueData[]> {
    const palpite = ctx.palpiteMap.get(membro.usuarioId);

    if (!palpite) {
      const esquecidos = await this.destaqueAcerto.gerarNaoPalpitou(
        membro,
        ctx,
      );
      await this.avaliarSubiuRanking(membro, ctx, esquecidos);
      return esquecidos;
    }

    await this.destaqueAcerto.sincronizarNaoPalpitouExistente(membro, ctx);

    const resultado = ctx.resultados.find(
      (r) => r.usuarioId === membro.usuarioId,
    );
    if (!resultado) return [];

    const destaques: CriarDestaqueData[] = [];
    await this.destaqueAcerto.gerarAcerto(membro, resultado, ctx, destaques);
    await this.avaliarSubiuRanking(membro, ctx, destaques);
    this.avaliarDobrouEAcertou(membro, resultado, ctx, destaques);
    await this.avaliarSequencias(membro, ctx, destaques);
    return destaques;
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

    const seqResultado =
      await this.sequenciaService.calcularMelhorSequenciaResultado(
        membro.usuarioId,
        ctx.jogo.faseId,
        ctx.jogo.rodada,
      );
    if (
      !seqResultado ||
      seqResultado.quantidade < DESTAQUES.LIMITES.SEQUENCIA_JOGOS_MINIMOS ||
      seqResultado.pontos < DESTAQUES.LIMITES.SEQUENCIA_PONTOS_MINIMOS
    ) {
      await this.destaqueRepo.removerPorTiposNaRodada(
        ctx.grupo.id,
        membro.usuarioId,
        ctx.jogo.rodada,
        ['SEQUENCIA_RESULTADO'],
      );
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
      rodadaFim: seqResultado.rodadaFim ?? ctx.jogo.rodada,
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
      const titulo = this.escolherTitulo(
        'SEQUENCIA_RESULTADO',
        ctx,
        membro.usuario.nome,
      );
      await this.destaqueRepo.atualizar(existente.id, {
        dados,
        titulo: titulo.title,
      });
      await this.destaqueRepo.removerPorTiposNaRodada(
        ctx.grupo.id,
        membro.usuarioId,
        ctx.jogo.rodada,
        ['SEQUENCIA_RESULTADO'],
        existente.id,
      );
      return;
    }

    destaques.push(
      this.buildDestaque('SEQUENCIA_RESULTADO', membro, ctx, dados),
    );
  }

  private escolherTitulo(
    tipo: Exclude<TipoDestaque, 'SEQUENCIA_MOSCA'>,
    ctx: GeracaoContexto,
    nomeUsuario: string,
  ) {
    const usados = [...(ctx.titulosUsadosPorTipo.get(tipo) ?? [])];
    const titulo = pickRandomTitle(
      tipo,
      ctx.ultimoTituloPorTipo.get(tipo),
      usados,
      inferirGeneroPorNome(nomeUsuario),
    );
    ctx.ultimoTituloPorTipo.set(tipo, titulo.id);
    const set = ctx.titulosUsadosPorTipo.get(tipo) ?? new Set<string>();
    set.add(titulo.title);
    ctx.titulosUsadosPorTipo.set(tipo, set);
    return titulo;
  }

  private buildDestaque(
    tipo: Exclude<TipoDestaque, 'SEQUENCIA_MOSCA'>,
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
    dados: object,
  ): CriarDestaqueData {
    const destaqueTitle = this.escolherTitulo(tipo, ctx, membro.usuario.nome);
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
}

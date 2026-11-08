import { Inject, Injectable } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import { inferirGeneroPorNome, pickRandomTitle } from '../destaques.titulos';
import type {
  CriarDestaqueData,
  DestaqueRepository,
} from '../repositories/destaque.repository.interface';
import { DestaqueSequenciaService } from './destaque-sequencia.service';
import type {
  GeracaoContexto,
  ResultadoMembro,
} from './destaque-geracao.contexto';
import type {
  TipoDestaque,
  MembroComUsuario,
  DadosAcertouEmCheio,
  DadosUnicoNaMosca,
  DadosNaoPalpitou,
  PlacarCravado,
  TimeInfo,
} from '../types/destaque.types';

@Injectable()
export class DestaqueAcertoService {
  constructor(
    @Inject(DESTAQUES.DESTAQUE_REPOSITORY_TOKEN)
    private readonly destaqueRepo: DestaqueRepository,
    private readonly sequenciaService: DestaqueSequenciaService,
  ) {}

  async sincronizarNaoPalpitouExistente(
    membro: MembroComUsuario,
    ctx: GeracaoContexto,
  ): Promise<void> {
    if (ctx.jogo.rodada === null) return;
    const existente = await this.destaqueRepo.buscarNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      'NAO_PALPITOU',
    );
    if (!existente) return;

    const esquecidos = await this.sequenciaService.listarEsquecidosDaRodada(
      membro.usuarioId,
      ctx.grupo.temporadaId,
      ctx.jogo.rodada,
    );
    if (esquecidos.length === 0) {
      await this.destaqueRepo.removerPorTiposNaRodada(
        ctx.grupo.id,
        membro.usuarioId,
        ctx.jogo.rodada,
        ['NAO_PALPITOU'],
      );
      return;
    }

    await this.destaqueRepo.atualizar(existente.id, {
      dados: {
        jogosEsquecidos: esquecidos,
        totalJogosRodada: esquecidos.length,
        rodada: ctx.jogo.rodada,
      } satisfies DadosNaoPalpitou,
      titulo: existente.titulo,
    });
  }

  async gerarNaoPalpitou(
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
          jogosEsquecidos: [this.buildJogoEsquecido(ctx)],
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
    const atual = this.buildJogoEsquecido(ctx);
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

  async gerarAcerto(
    membro: MembroComUsuario,
    resultado: ResultadoMembro,
    ctx: GeracaoContexto,
    destaques: CriarDestaqueData[],
  ): Promise<void> {
    if (resultado.categoriaAcerto !== 'ACERTO_EM_CHEIO') return;
    if (
      ctx.jogo.rodada === null ||
      ctx.jogo.golsCasa === null ||
      ctx.jogo.golsFora === null
    ) {
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
      ctx.unicoNaMosca && ctx.membrosNaMosca[0]?.usuarioId === membro.usuarioId;

    if (unicoDesteJogo) {
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
      ['SEQUENCIA_MOSCA'],
    );

    const unicosIds = await this.destaqueRepo.buscarUnicosNaMoscaDaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      lista.map((jogo) => jogo.jogoId),
    );
    const listaCompartilhada = lista.filter(
      (jogo) => jogo.jogoId === ctx.jogo.id || !unicosIds.has(jogo.jogoId),
    );
    if (listaCompartilhada.length === 0) return;

    const dados = this.dadosDoAcerto(listaCompartilhada);
    const existente = await this.destaqueRepo.buscarNaRodada(
      ctx.grupo.id,
      membro.usuarioId,
      ctx.jogo.rodada,
      'ACERTOU_EM_CHEIO',
    );
    if (existente) {
      const titulo = this.escolherTitulo(
        'ACERTOU_EM_CHEIO',
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
      jogoId: principal.jogoId,
      golsCasa: principal.golsCasa,
      golsFora: principal.golsFora,
      timeCasa: principal.timeCasa,
      timeFora: principal.timeFora,
      ...(lista.length > 1 ? { jogos: lista } : {}),
    };
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

  private buildJogoEsquecido(ctx: GeracaoContexto) {
    return {
      jogoId: ctx.jogo.id,
      timeCasa: this.buildTimeInfo(ctx.jogo.timeCasa),
      timeFora: this.buildTimeInfo(ctx.jogo.timeFora),
      golsCasa: ctx.jogo.golsCasa,
      golsFora: ctx.jogo.golsFora,
    };
  }
}

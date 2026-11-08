import { Inject, Injectable } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import { PALPITES } from '../../palpites/palpites.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { PontuacaoService } from '../../ranking/services/pontuacao.service';
import type { PalpiteRepository } from '../../palpites/repositories/palpite.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import { DestaqueRecordeService } from './destaque-recorde.service';
import type {
  CategoriaRecorde,
  JogoEsquecido,
  JogoSequencia,
  PlacarCravado,
  RecordeInfo,
} from '../types/destaque.types';
import {
  calcularMelhorSequenciaDaRodada,
  calcularSequenciaAte,
  type SequenciaCalculada,
} from './sequencia-resultado.calculo';
import {
  calcularRodadasParaConsulta,
  extrairCravadas,
  extrairEsquecidos,
  filtrarFinalizadosOrdenados,
  montarCargaSequencia,
  type JogoInternoSequencia,
  type PalpiteInternoSequencia,
} from './sequencia-jogos.helper';

export interface SequenciaResultado {
  quantidade: number;
  pontos: number;
  ultimosJogos: JogoSequencia[];
  rodadaInicio: number | null;
  rodadaFim: number | null;
}

@Injectable()
export class DestaqueSequenciaService {
  constructor(
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    private readonly pontuacaoService: PontuacaoService,
    private readonly recordeService: DestaqueRecordeService,
  ) {}

  async calcularSequenciaResultado(
    usuarioId: string,
    faseId: string,
    rodadaAtual: number | null,
    jogoAtualId: string,
  ): Promise<SequenciaResultado | null> {
    if (rodadaAtual === null) return null;
    const todosJogos = await this.buscarJogosDasRodadas(faseId, rodadaAtual);
    const carregado = await this.carregarParaSequencia(usuarioId, todosJogos);
    if (!carregado) return null;
    const indiceAtual = carregado.jogos.findIndex((j) => j.id === jogoAtualId);
    if (indiceAtual === -1) return null;
    return this.publicar(
      calcularSequenciaAte(carregado.jogos, indiceAtual, carregado.pontosDe),
    );
  }

  async calcularMelhorSequenciaResultado(
    usuarioId: string,
    faseId: string,
    rodadaAtual: number | null,
  ): Promise<SequenciaResultado | null> {
    if (rodadaAtual === null) return null;
    const todosJogos = await this.buscarJogosDasRodadas(faseId, rodadaAtual);
    return this.melhorSequenciaComJogos(usuarioId, todosJogos, rodadaAtual);
  }

  async calcularMelhoresSequenciasBatch(
    usuarioIds: string[],
    faseId: string,
    rodadaAtual: number,
  ): Promise<Map<string, SequenciaResultado | null>> {
    const todosJogos = await this.buscarJogosDasRodadas(faseId, rodadaAtual);
    const finalizados = todosJogos.filter((j) => j.status === 'FINALIZADO');
    const jogoIds = finalizados.map((j) => j.id);
    const palpites =
      usuarioIds.length === 0 || jogoIds.length === 0
        ? []
        : ((await this.palpiteRepo.listarPorJogosEUsuarios(
            jogoIds,
            usuarioIds,
          )) as PalpiteInternoSequencia[]);

    const palpitesPorUsuario = new Map<
      string,
      Map<string, PalpiteInternoSequencia>
    >();
    for (const usuarioId of usuarioIds) {
      palpitesPorUsuario.set(
        usuarioId,
        new Map<string, PalpiteInternoSequencia>(),
      );
    }
    for (const palpite of palpites) {
      const mapaUsuario = palpitesPorUsuario.get(palpite.usuarioId);
      if (!mapaUsuario) continue;
      mapaUsuario.set(palpite.jogoId, palpite);
    }

    const mapa = new Map<string, SequenciaResultado | null>();
    for (const usuarioId of usuarioIds) {
      const palpiteMap =
        palpitesPorUsuario.get(usuarioId) ??
        new Map<string, PalpiteInternoSequencia>();
      const carregado = montarCargaSequencia(
        finalizados,
        palpiteMap,
        this.pontuacaoService,
      );
      if (!carregado) {
        mapa.set(usuarioId, null);
        continue;
      }
      const melhor = calcularMelhorSequenciaDaRodada(
        carregado.jogos,
        rodadaAtual,
        carregado.pontosDe,
      );
      mapa.set(usuarioId, melhor ? this.publicar(melhor) : null);
    }
    return mapa;
  }

  async listarCravadasDaRodada(
    usuarioId: string,
    temporadaId: string,
    rodada: number | null,
  ): Promise<PlacarCravado[]> {
    if (rodada === null) return [];
    const jogos = await this.jogosFinalizadosDaRodada(temporadaId, rodada);
    if (jogos.length === 0) return [];
    const palpiteMap = await this.buscarPalpitesDoUsuario(jogos, usuarioId);
    return extrairCravadas(jogos, palpiteMap, this.pontuacaoService);
  }

  async listarEsquecidosDaRodada(
    usuarioId: string,
    temporadaId: string,
    rodada: number | null,
  ): Promise<JogoEsquecido[]> {
    if (rodada === null) return [];
    const jogos = await this.jogosFinalizadosDaRodada(temporadaId, rodada);
    if (jogos.length === 0) return [];
    const palpiteMap = await this.buscarPalpitesDoUsuario(jogos, usuarioId);
    return extrairEsquecidos(jogos, palpiteMap);
  }

  async listarEsquecidosBatch(
    usuarioIds: string[],
    temporadaId: string,
    rodada: number,
  ): Promise<Map<string, JogoEsquecido[]>> {
    const jogos = await this.jogosFinalizadosDaRodada(temporadaId, rodada);
    const mapa = new Map<string, JogoEsquecido[]>();
    if (jogos.length === 0 || usuarioIds.length === 0) {
      for (const id of usuarioIds) mapa.set(id, []);
      return mapa;
    }

    const todosPalpites = (await this.palpiteRepo.listarPorJogosEUsuarios(
      jogos.map((j) => j.id),
      usuarioIds,
    )) as PalpiteInternoSequencia[];
    const porUsuario = new Map<string, Map<string, PalpiteInternoSequencia>>();
    for (const palpite of todosPalpites) {
      const interno =
        porUsuario.get(palpite.usuarioId) ??
        new Map<string, PalpiteInternoSequencia>();
      interno.set(palpite.jogoId, palpite);
      porUsuario.set(palpite.usuarioId, interno);
    }

    for (const usuarioId of usuarioIds) {
      mapa.set(
        usuarioId,
        extrairEsquecidos(
          jogos,
          porUsuario.get(usuarioId) ??
            new Map<string, PalpiteInternoSequencia>(),
        ),
      );
    }
    return mapa;
  }

  atualizarRecorde(
    grupoId: string,
    temporadaId: string,
    categoria: CategoriaRecorde,
    usuarioId: string,
    novoValor: number,
  ): Promise<RecordeInfo> {
    return this.recordeService.atualizar(
      grupoId,
      temporadaId,
      categoria,
      usuarioId,
      novoValor,
    );
  }

  private async melhorSequenciaComJogos(
    usuarioId: string,
    todosJogos: JogoInternoSequencia[],
    rodadaAtual: number,
  ): Promise<SequenciaResultado | null> {
    const carregado = await this.carregarParaSequencia(usuarioId, todosJogos);
    if (!carregado) return null;
    const melhor = calcularMelhorSequenciaDaRodada(
      carregado.jogos,
      rodadaAtual,
      carregado.pontosDe,
    );
    return melhor ? this.publicar(melhor) : null;
  }

  private async jogosFinalizadosDaRodada(
    temporadaId: string,
    rodada: number,
  ): Promise<JogoInternoSequencia[]> {
    return filtrarFinalizadosOrdenados(
      (await this.jogoRepo.buscarTodosPorTemporada(temporadaId)).filter(
        (jogo) => jogo.rodada === rodada,
      ) as JogoInternoSequencia[],
    );
  }

  private async buscarPalpitesDoUsuario(
    jogos: JogoInternoSequencia[],
    usuarioId: string,
  ): Promise<Map<string, PalpiteInternoSequencia>> {
    const todosPalpites = (await this.palpiteRepo.buscarPorUsuarioEJogos(
      usuarioId,
      jogos.map((j) => j.id),
    )) as PalpiteInternoSequencia[];
    return new Map(todosPalpites.map((p) => [p.jogoId, p]));
  }

  private async buscarJogosDasRodadas(
    faseId: string,
    rodadaAtual: number,
  ): Promise<JogoInternoSequencia[]> {
    const todosJogos: JogoInternoSequencia[] = [];
    for (const rodada of calcularRodadasParaConsulta(rodadaAtual)) {
      const jogos = (await this.jogoRepo.buscarPorFase(
        faseId,
        rodada,
      )) as JogoInternoSequencia[];
      todosJogos.push(...jogos);
    }
    return todosJogos;
  }

  private async carregarParaSequencia(
    usuarioId: string,
    todosJogos: JogoInternoSequencia[],
  ) {
    const finalizados = todosJogos.filter((j) => j.status === 'FINALIZADO');
    const palpiteMap = await this.buscarPalpitesDoUsuario(
      finalizados,
      usuarioId,
    );
    return montarCargaSequencia(finalizados, palpiteMap, this.pontuacaoService);
  }

  private publicar(sequencia: SequenciaCalculada): SequenciaResultado | null {
    if (sequencia.quantidade < DESTAQUES.LIMITES.SEQUENCIA_JOGOS_MINIMOS)
      return null;
    return {
      quantidade: sequencia.quantidade,
      pontos: sequencia.pontos,
      rodadaInicio: sequencia.rodadaInicio,
      rodadaFim: sequencia.rodadaFim,
      ultimosJogos: sequencia.ultimosJogos.slice(
        -DESTAQUES.LIMITES.ULTIMOS_JOGOS_SEQUENCIA,
      ),
    };
  }
}

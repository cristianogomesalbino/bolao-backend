import { Inject, Injectable } from '@nestjs/common';
import { DESTAQUES } from '../destaques.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { DestaqueSequenciaService } from './destaque-sequencia.service';
import {
  consolidarAcertosPanelinha,
  manterUmPorPessoaNaRodada,
  selecionarDestaquesDiversos,
} from './destaque-selecao';
import type {
  DestaqueComAutor,
  DestaqueRepository,
} from '../repositories/destaque.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import {
  DestaquePresenter,
  type DestaqueHttp,
} from '../../../common/presenters/destaque.presenter';

export interface ListagemDestaquesResult {
  rodadasDisponiveis: number[];
  destaques: DestaqueHttp[];
}

@Injectable()
export class DestaqueListagemService {
  constructor(
    @Inject(DESTAQUES.DESTAQUE_REPOSITORY_TOKEN)
    private readonly destaqueRepo: DestaqueRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
    private readonly sequenciaService: DestaqueSequenciaService,
  ) {}

  async listar(
    grupoId: string,
    usuarioId: string,
    rodadaQuery?: string,
  ): Promise<ListagemDestaquesResult> {
    const rodadaPedida = Number(rodadaQuery);
    const preview = Number.isInteger(rodadaPedida) && rodadaPedida > 0;
    const rodadaAtual = await this.obterRodadaAtualDoGrupo(grupoId);
    const rodadas = preview
      ? [rodadaPedida]
      : this.calcularRodadasVisiveis(rodadaAtual);
    const rodadasDisponiveis =
      await this.destaqueRepo.listarRodadasPorGrupo(grupoId);

    const encontrados = await this.destaqueRepo.buscarPorGrupoERodadas(
      grupoId,
      rodadas,
      DESTAQUES.LIMITES.BUSCA_LISTAGEM,
    );

    const processados = await this.aplicarRegrasDeFeed(grupoId, encontrados);
    const destaques = selecionarDestaquesDiversos(
      processados,
      DESTAQUES.LIMITES.MAX_DESTAQUES_LISTAGEM,
      DESTAQUES.PRIORIDADE_POR_TIPO,
    );

    const destaqueIds = destaques.map((s) => s.id);
    const visualizados = await this.destaqueRepo.buscarVisualizacoes(
      destaqueIds,
      usuarioId,
    );
    const naoPalpitouIds = destaques
      .filter((d) => d.tipo === 'NAO_PALPITOU')
      .map((d) => d.id);
    const idsComReacao = await this.destaqueRepo.buscarReacoesDoUsuario(
      usuarioId,
      naoPalpitouIds,
    );

    return {
      rodadasDisponiveis,
      destaques: destaques.map((s) =>
        DestaquePresenter.toHttp(s, {
          jaEnviouF: idsComReacao.has(s.id),
          visualizado: visualizados.has(s.id),
        }),
      ),
    };
  }

  async marcarVisualizados(
    grupoId: string,
    usuarioId: string,
    destaqueIds: string[],
  ): Promise<{ registrados: number }> {
    const idsValidos = await this.destaqueRepo.filtrarIdsDoGrupo(
      grupoId,
      destaqueIds,
    );
    await this.destaqueRepo.criarVisualizacoesBatch(
      idsValidos.map((destaqueId) => ({ destaqueId, usuarioId })),
    );
    return { registrados: idsValidos.length };
  }

  /**
   * Rodadas em que o F/interação é permitida — alinhado ao filtro do FE
   * (até 2 primeiras de `rodadasDisponiveis`).
   */
  async obterRodadasVisiveis(grupoId: string): Promise<number[]> {
    const disponiveis = await this.destaqueRepo.listarRodadasPorGrupo(grupoId);
    if (disponiveis.length > 0) return disponiveis.slice(0, 2);

    const rodadaAtual = await this.obterRodadaAtualDoGrupo(grupoId);
    return this.calcularRodadasVisiveis(rodadaAtual);
  }

  private async aplicarRegrasDeFeed(
    grupoId: string,
    encontrados: DestaqueComAutor[],
  ): Promise<DestaqueComAutor[]> {
    const contexto = await this.obterContextoGrupo(grupoId);
    const comSequencia = await this.aplicarSequencias(
      encontrados,
      contexto.faseId,
    );
    const semSubiu = manterUmPorPessoaNaRodada(comSequencia, 'SUBIU_RANKING');
    const semNao = manterUmPorPessoaNaRodada(semSubiu, 'NAO_PALPITOU');
    const semAcerto = manterUmPorPessoaNaRodada(semNao, 'ACERTOU_EM_CHEIO');
    const comPanelinha = consolidarAcertosPanelinha(semAcerto);

    if (!contexto.temporadaId) return comPanelinha;
    return this.sincronizarNaoPalpitouBatch(comPanelinha, contexto.temporadaId);
  }

  private async aplicarSequencias(
    destaques: DestaqueComAutor[],
    faseId: string | null,
  ): Promise<DestaqueComAutor[]> {
    if (!faseId) return destaques;
    const sequencias = destaques.filter(
      (d) => d.tipo === 'SEQUENCIA_RESULTADO' && d.rodada != null,
    );
    if (sequencias.length === 0) return destaques;

    const porRodada = new Map<number, Set<string>>();
    for (const item of sequencias) {
      const pessoaId = item.usuario?.id || item.usuarioId;
      const set = porRodada.get(item.rodada!) ?? new Set();
      set.add(pessoaId);
      porRodada.set(item.rodada!, set);
    }

    const melhores = new Map<
      string,
      Awaited<
        ReturnType<DestaqueSequenciaService['calcularMelhorSequenciaResultado']>
      >
    >();
    await Promise.all(
      [...porRodada.entries()].map(async ([rodada, usuarios]) => {
        const batch =
          await this.sequenciaService.calcularMelhoresSequenciasBatch(
            [...usuarios],
            faseId,
            rodada,
          );
        for (const [usuarioId, seq] of batch) {
          melhores.set(`${usuarioId}:${rodada}`, seq);
        }
      }),
    );

    const vistos = new Set<string>();
    const saida: DestaqueComAutor[] = [];
    for (const item of destaques) {
      if (item.tipo !== 'SEQUENCIA_RESULTADO' || item.rodada == null) {
        saida.push(item);
        continue;
      }
      const pessoaId = item.usuario?.id || item.usuarioId;
      const chave = `${pessoaId}:${item.rodada}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const melhor = melhores.get(chave);
      if (
        !melhor ||
        melhor.quantidade < DESTAQUES.LIMITES.SEQUENCIA_JOGOS_MINIMOS ||
        melhor.pontos < DESTAQUES.LIMITES.SEQUENCIA_PONTOS_MINIMOS
      ) {
        continue;
      }
      saida.push({
        ...item,
        dados: {
          ...item.dados,
          quantidadeAcertos: melhor.quantidade,
          pontos: melhor.pontos,
          rodadaInicio: melhor.rodadaInicio,
          rodadaFim: melhor.rodadaFim,
          ultimosJogos: melhor.ultimosJogos,
        },
      });
    }
    return saida;
  }

  private async sincronizarNaoPalpitouBatch(
    destaques: DestaqueComAutor[],
    temporadaId: string,
  ): Promise<DestaqueComAutor[]> {
    const candidatos = destaques.filter(
      (d) => d.tipo === 'NAO_PALPITOU' && d.rodada != null,
    );
    if (candidatos.length === 0) return destaques;

    const porRodada = new Map<number, Set<string>>();
    for (const item of candidatos) {
      const pessoaId = item.usuario?.id || item.usuarioId;
      const set = porRodada.get(item.rodada!) ?? new Set();
      set.add(pessoaId);
      porRodada.set(item.rodada!, set);
    }

    const esquecidosMap = new Map<
      string,
      Awaited<ReturnType<DestaqueSequenciaService['listarEsquecidosDaRodada']>>
    >();
    await Promise.all(
      [...porRodada.entries()].map(async ([rodada, usuarios]) => {
        const batch = await this.sequenciaService.listarEsquecidosBatch(
          [...usuarios],
          temporadaId,
          rodada,
        );
        for (const [usuarioId, lista] of batch) {
          esquecidosMap.set(`${usuarioId}:${rodada}`, lista);
        }
      }),
    );

    const saida: DestaqueComAutor[] = [];
    for (const item of destaques) {
      if (item.tipo !== 'NAO_PALPITOU' || item.rodada == null) {
        saida.push(item);
        continue;
      }
      const pessoaId = item.usuario?.id || item.usuarioId;
      const esquecidos = esquecidosMap.get(`${pessoaId}:${item.rodada}`) ?? [];
      if (esquecidos.length === 0) continue;
      saida.push({
        ...item,
        dados: {
          ...item.dados,
          jogosEsquecidos: esquecidos,
          totalJogosRodada: esquecidos.length,
          rodada: item.rodada,
        },
      });
    }
    return saida;
  }

  private async obterContextoGrupo(
    grupoId: string,
  ): Promise<{ temporadaId: string | null; faseId: string | null }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Repo retorna any (dívida técnica)
    const grupo = await this.grupoRepo.buscarPorId(grupoId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Repo retorna any (dívida técnica)
    const temporadaId = grupo?.temporadaId
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Repo retorna any (dívida técnica)
        String(grupo.temporadaId)
      : null;
    if (!temporadaId) return { temporadaId: null, faseId: null };

    const fases = await this.faseRepo.buscarPorTemporada(temporadaId);
    const fasePontosCorridos = fases.find((f) => f.tipo === 'PONTOS_CORRIDOS');
    return { temporadaId, faseId: fasePontosCorridos?.id ?? null };
  }

  private async obterRodadaAtualDoGrupo(
    grupoId: string,
  ): Promise<number | null> {
    const { faseId } = await this.obterContextoGrupo(grupoId);
    if (!faseId) return null;
    return this.jogoRepo.buscarMaiorRodadaFinalizada(faseId);
  }

  private calcularRodadasVisiveis(rodadaAtual: number | null): number[] {
    if (rodadaAtual === null) return [];
    return [rodadaAtual];
  }
}

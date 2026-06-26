import { Inject, Injectable, Logger } from '@nestjs/common';
import { JOGOS, COPA_CHAVEAMENTO_16AVOS } from '../jogos.constants';
import { TIMES } from '../../times/time.constants';
import type { JogoRepository } from '../repositories/jogo.repository.interface';
import type { FaseRepository } from '../repositories/fase.repository.interface';
import type { TimeRepository } from '../../times/repositories/time.repository.interface';
import { FutebolApiService } from './futebol-api.service';
import type { CampeonatoConfig } from '../jogos.constants';

const TBD_ID = '00000000-0000-0000-0000-000000000001';

interface ClassificacaoTime {
  timeId: string;
  pontos: number;
  sg: number;
  gp: number;
}

interface JogoComRelacoes {
  id: string;
  faseId: string;
  timeCasaId: string;
  timeForaId: string;
  dataHora: Date | null;
  rodada: number | null;
  status: string;
  externoId: string | null;
  timeCasa?: { id: string; sigla: string; nome: string } | null;
  timeFora?: { id: string; sigla: string; nome: string } | null;
  fase?: { id: string; nome: string; tipo: string; ordem: number } | null;
}

interface JogoNormalizado {
  externoId: string;
  dataHora: string | null;
  status: string;
  timeCasa: { externoId: string; nome: string; sigla: string; escudo: string };
  timeFora: { externoId: string; nome: string; sigla: string; escudo: string };
  golsCasa: number | null;
  golsFora: number | null;
  penaltisCasa: number | null;
  penaltisFora: number | null;
}

type ClassificacaoMap = Map<string, ClassificacaoTime[]>;

@Injectable()
export class ChaveamentoService {
  private readonly logger = new Logger(ChaveamentoService.name);

  constructor(
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(TIMES.REPOSITORY_TOKEN)
    private readonly timeRepo: TimeRepository,
    private readonly futebolApiService: FutebolApiService,
  ) {}

  /**
   * Preenche a próxima fase eliminatória que tenha jogos com times TBD.
   * Prioriza API do GE, fallback via classificação/chaveamento.
   */
  async preencherProximaFaseEliminatoria(
    temporadaId: string,
    config: CampeonatoConfig,
  ): Promise<void> {
    const jogosComTBD = (await this.jogoRepo.buscarJogosComTimePlaceholder(
      temporadaId,
      TBD_ID,
    )) as JogoComRelacoes[];

    if (jogosComTBD.length === 0) {
      this.logger.log('✅ Todos os jogos eliminatórios com times definidos');
      return;
    }

    const primeiraFaseId = jogosComTBD[0]?.faseId;
    const jogosDaPrimeiraFase = jogosComTBD.filter(
      (j) => j.faseId === primeiraFaseId,
    );
    const nomeFase = jogosComTBD[0]?.fase?.nome ?? 'desconhecida';

    this.logger.log(
      `🔄 ${nomeFase}: ${jogosDaPrimeiraFase.length} jogos pendentes`,
    );

    const preenchidosViaApi = await this.tentarPreencherViaApi(
      jogosDaPrimeiraFase,
      config,
    );
    if (preenchidosViaApi.size > 0) {
      this.logger.log(`🌐 ${preenchidosViaApi.size} preenchidos via GE`);
    }

    const restantes = jogosDaPrimeiraFase.filter(
      (j) => !preenchidosViaApi.has(j.id),
    );
    if (restantes.length === 0) return;

    await this.preencherViaClassificacao(restantes, temporadaId);
  }

  private async tentarPreencherViaApi(
    jogosComTBD: JogoComRelacoes[],
    config: CampeonatoConfig,
  ): Promise<Set<string>> {
    const preenchidos = new Set<string>();

    try {
      const faseConfig = config.fases.find((f) =>
        f.slug.includes('segunda-fase'),
      );
      if (!faseConfig) return preenchidos;

      const faseSlug = config.buildFaseSlug(faseConfig.slug);
      const rodadas = [
        ...new Set(
          jogosComTBD
            .map((j) => j.rodada)
            .filter((r): r is number => r !== null),
        ),
      ];

      const jogosApi = await this.futebolApiService.buscarJogosPorRodadas(
        config.campeonatoId,
        faseSlug,
        rodadas,
      );

      for (const jogoApi of jogosApi) {
        const normalizado = this.futebolApiService.normalizarJogo(
          jogoApi,
        ) as JogoNormalizado;
        const jogoLocal = this.matchPorHorario(jogosComTBD, normalizado);
        if (!jogoLocal) continue;

        const atualizado = await this.atualizarTimesDoJogo(
          jogoLocal,
          normalizado,
        );
        if (atualizado) {
          preenchidos.add(jogoLocal.id);
        }
      }
    } catch {
      this.logger.warn('GE indisponível, usando fallback');
    }

    return preenchidos;
  }

  private async preencherViaClassificacao(
    jogosComTBD: JogoComRelacoes[],
    temporadaId: string,
  ): Promise<void> {
    const classificacao = await this.calcularClassificacaoGrupos(temporadaId);
    if (!classificacao) {
      this.logger.warn('⚠️ Nenhum grupo completo ainda');
      return;
    }

    const siglaMap = await this.montarMapaSiglas(classificacao);

    this.logger.log(
      `📊 Grupos completos: ${[...classificacao.keys()].join(', ')}`,
    );

    const resumoJogos: string[] = [];

    for (const jogo of jogosComTBD) {
      const regra = COPA_CHAVEAMENTO_16AVOS.find(
        (c) => c.rodada === jogo.rodada,
      );
      if (!regra) continue;

      const { updateData, mudou, casaLabel, foraLabel } =
        this.resolverTimesDoJogo(jogo, regra, classificacao, siglaMap);

      if (mudou) {
        await this.jogoRepo.atualizar(jogo.id, updateData);
      }

      resumoJogos.push(`R${jogo.rodada}: ${casaLabel} x ${foraLabel}`);
    }

    this.logger.log(`🏆 ${resumoJogos.join(' | ')}`);
  }

  private resolverTimesDoJogo(
    jogo: JogoComRelacoes,
    regra: { casa: string; fora: string },
    classificacao: ClassificacaoMap,
    siglaMap: Map<string, string>,
  ): {
    updateData: Record<string, string>;
    mudou: boolean;
    casaLabel: string;
    foraLabel: string;
  } {
    const updateData: Record<string, string> = {};
    let mudou = false;
    let casaLabel = jogo.timeCasa?.sigla ?? regra.casa;
    let foraLabel = jogo.timeFora?.sigla ?? regra.fora;

    if (jogo.timeCasaId === TBD_ID) {
      const timeId = this.resolverPosicao(regra.casa, classificacao);
      casaLabel = timeId ? (siglaMap.get(timeId) ?? regra.casa) : regra.casa;
      if (timeId) {
        updateData.timeCasaId = timeId;
        mudou = true;
      }
    }

    if (jogo.timeForaId === TBD_ID) {
      const timeId = this.resolverPosicao(regra.fora, classificacao);
      foraLabel = timeId ? (siglaMap.get(timeId) ?? regra.fora) : regra.fora;
      if (timeId) {
        updateData.timeForaId = timeId;
        mudou = true;
      }
    }

    return { updateData, mudou, casaLabel, foraLabel };
  }

  private async montarMapaSiglas(
    classificacao: ClassificacaoMap,
  ): Promise<Map<string, string>> {
    const todosTimeIds: string[] = [];
    for (const grupo of classificacao.values()) {
      for (const t of grupo) todosTimeIds.push(t.timeId);
    }

    const siglaMap = new Map<string, string>();
    for (const timeId of todosTimeIds) {
      const time = await this.timeRepo.buscarPorId(timeId);
      if (time) siglaMap.set(timeId, time.sigla as string);
    }
    return siglaMap;
  }

  private resolverPosicao(
    posicao: string,
    classificacao: ClassificacaoMap,
  ): string | null {
    const matchDireto = /^(\d)([A-L])$/.exec(posicao);
    if (matchDireto) {
      const pos = Number.parseInt(matchDireto[1]) - 1;
      const grupo = `Grupo ${matchDireto[2]}`;
      const grupoData = classificacao.get(grupo);
      if (!grupoData || grupoData.length < pos + 1) return null;
      return grupoData[pos]?.timeId ?? null;
    }

    if (/^3[A-L]+$/.test(posicao)) return null;

    return null;
  }

  private async calcularClassificacaoGrupos(
    temporadaId: string,
  ): Promise<ClassificacaoMap | null> {
    const fases = await this.faseRepo.buscarPorTemporada(temporadaId);
    const fasesGrupos = (fases as { id: string; nome: string; tipo: string }[]).filter(
      (f) => f.tipo === 'PONTOS_CORRIDOS',
    );
    if (fasesGrupos.length === 0) return null;

    const resultado: ClassificacaoMap = new Map();

    for (const fase of fasesGrupos) {
      const jogos = (await this.jogoRepo.buscarPorFase(fase.id)) as {
        status: string;
        timeCasaId: string;
        timeForaId: string;
        golsCasa: number | null;
        golsFora: number | null;
      }[];
      const jogosFinalizados = jogos.filter((j) => j.status === 'FINALIZADO');

      if (jogosFinalizados.length < 6) continue;

      const stats = new Map<string, ClassificacaoTime>();

      for (const jogo of jogosFinalizados) {
        this.contabilizarJogo(stats, jogo);
      }

      const classificados = [...stats.values()].sort(
        (a, b) => b.pontos - a.pontos || b.sg - a.sg || b.gp - a.gp,
      );
      resultado.set(fase.nome, classificados);
    }

    return resultado;
  }

  private contabilizarJogo(
    stats: Map<string, ClassificacaoTime>,
    jogo: {
      timeCasaId: string;
      timeForaId: string;
      golsCasa: number | null;
      golsFora: number | null;
    },
  ): void {
    const gc = jogo.golsCasa ?? 0;
    const gf = jogo.golsFora ?? 0;

    const casa = stats.get(jogo.timeCasaId) ?? {
      timeId: jogo.timeCasaId,
      pontos: 0,
      sg: 0,
      gp: 0,
    };
    casa.gp += gc;
    casa.sg += gc - gf;
    casa.pontos += this.pontosJogo(gc, gf);
    stats.set(jogo.timeCasaId, casa);

    const fora = stats.get(jogo.timeForaId) ?? {
      timeId: jogo.timeForaId,
      pontos: 0,
      sg: 0,
      gp: 0,
    };
    fora.gp += gf;
    fora.sg += gf - gc;
    fora.pontos += this.pontosJogo(gf, gc);
    stats.set(jogo.timeForaId, fora);
  }

  private pontosJogo(golsPro: number, golsContra: number): number {
    if (golsPro > golsContra) return 3;
    if (golsPro === golsContra) return 1;
    return 0;
  }

  private matchPorHorario(
    jogosLocais: JogoComRelacoes[],
    jogoApi: JogoNormalizado,
  ): JogoComRelacoes | null {
    if (!jogoApi.dataHora) return null;
    return (
      jogosLocais.find((j) => {
        if (!j.dataHora) return false;
        const diff = Math.abs(
          new Date(j.dataHora).getTime() -
            new Date(jogoApi.dataHora!).getTime(),
        );
        return diff <= 30 * 60 * 1000;
      }) ?? null
    );
  }

  private async atualizarTimesDoJogo(
    jogoLocal: JogoComRelacoes,
    normalizado: JogoNormalizado,
  ): Promise<boolean> {
    const updateData: Record<string, string> = {};
    let mudou = false;

    if (jogoLocal.timeCasaId === TBD_ID && normalizado.timeCasa?.externoId) {
      const time = await this.resolverOuCriarTime(normalizado.timeCasa);
      updateData.timeCasaId = time.id;
      mudou = true;
    }
    if (jogoLocal.timeForaId === TBD_ID && normalizado.timeFora?.externoId) {
      const time = await this.resolverOuCriarTime(normalizado.timeFora);
      updateData.timeForaId = time.id;
      mudou = true;
    }
    if (!jogoLocal.externoId && normalizado.externoId) {
      updateData.externoId = normalizado.externoId;
    }

    if (mudou) {
      await this.jogoRepo.atualizar(jogoLocal.id, updateData);
    }
    return mudou;
  }

  private async resolverOuCriarTime(timeData: {
    externoId: string;
    nome: string;
    sigla: string;
    escudo: string;
  }): Promise<{ id: string }> {
    const existente = await this.timeRepo.buscarPorExternoId(
      timeData.externoId,
    );
    if (existente) return existente as { id: string };

    return (await this.timeRepo.criar({
      nome: timeData.nome,
      sigla: timeData.sigla,
      escudo: timeData.escudo ?? null,
      externoId: timeData.externoId,
    })) as { id: string };
  }
}

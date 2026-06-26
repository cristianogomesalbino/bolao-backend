import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  JOGOS,
  COPA_CHAVEAMENTO_16AVOS,
  COPA_BRACKET_OITAVAS,
  COPA_BRACKET_QUARTAS,
  COPA_BRACKET_SEMIS,
  COPA_BRACKET_FINAL,
  COPA_BRACKET_TERCEIRO,
} from '../jogos.constants';
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

interface FaseBasica {
  id: string;
  nome: string;
  tipo: string;
  ordem: number;
}

interface JogoOrigem {
  id: string;
  rodada: number | null;
  status: string;
  vencedorId: string | null;
  timeCasaId: string;
  timeForaId: string;
}

interface JogoDestino {
  id: string;
  rodada: number | null;
  timeCasaId: string;
  timeForaId: string;
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
    // Criar/atualizar jogos de eliminatórias conforme times são classificados
    await this.criarOuAtualizarJogosEliminatorios(temporadaId, config);

    // Tentar enriquecer via API do GE (externoId, horários mais precisos)
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

  /**
   * Tenta importar jogos da próxima fase eliminatória vazia via API do GE.
   * Se a API não tem dados, cria jogos sob demanda conforme times são classificados.
   */
  private async criarOuAtualizarJogosEliminatorios(
    temporadaId: string,
    _config: CampeonatoConfig,
  ): Promise<void> {
    const fase16Avos = await this.buscarFase16Avos(temporadaId);
    if (!fase16Avos) return;

    const classificacao = await this.calcularClassificacaoGrupos(temporadaId);
    if (!classificacao) return;

    const tbdId = await this.garantirTimeTBD();

    const jogosExistentes = (await this.jogoRepo.buscarPorFase(
      fase16Avos.id,
    )) as {
      id: string;
      rodada: number | null;
      timeCasaId: string;
      timeForaId: string;
    }[];
    const jogosPorRodada = new Map<number, (typeof jogosExistentes)[0]>();
    for (const j of jogosExistentes) {
      if (j.rodada) jogosPorRodada.set(j.rodada, j);
    }

    const siglaMap = await this.montarMapaSiglas(classificacao);
    let criados = 0;
    let atualizados = 0;

    for (const entrada of COPA_CHAVEAMENTO_16AVOS) {
      const resultado = await this.processarEntradaChaveamento(
        entrada,
        fase16Avos.id,
        classificacao,
        jogosPorRodada,
        tbdId,
      );
      criados += resultado.criado ? 1 : 0;
      atualizados += resultado.atualizado ? 1 : 0;
    }

    if (criados > 0 || atualizados > 0) {
      const resumo = this.montarResumoChaveamento(classificacao, siglaMap);
      this.logger.log(
        `🏗️ ${criados} criados, ${atualizados} atualizados | ${resumo}`,
      );
    }
  }

  private async buscarFase16Avos(
    temporadaId: string,
  ): Promise<{ id: string; nome: string } | null> {
    const fases = await this.faseRepo.buscarPorTemporada(temporadaId);
    return (
      (fases as FaseBasica[]).find(
        (f) =>
          f.tipo === 'MATA_MATA' && f.nome.toLowerCase().includes('16 avos'),
      ) ?? null
    );
  }

  private async garantirTimeTBD(): Promise<string> {
    const timeTBD =
      ((await this.timeRepo.buscarPorSigla('TBD')) as {
        id: string;
      } | null) ??
      ((await this.timeRepo.criar({
        nome: 'A Definir',
        sigla: 'TBD',
        escudo: null,
        externoId: null,
      })) as { id: string });
    return timeTBD.id;
  }

  private async processarEntradaChaveamento(
    entrada: { rodada: number; casa: string; fora: string; dataHora: string },
    faseId: string,
    classificacao: ClassificacaoMap,
    jogosPorRodada: Map<
      number,
      { id: string; timeCasaId: string; timeForaId: string }
    >,
    tbdId: string,
  ): Promise<{ criado: boolean; atualizado: boolean }> {
    const timeCasaId = this.resolverPosicao(entrada.casa, classificacao);
    const timeForaId = this.resolverPosicao(entrada.fora, classificacao);

    if (!timeCasaId && !timeForaId) return { criado: false, atualizado: false };

    const jogoExistente = jogosPorRodada.get(entrada.rodada);

    if (!jogoExistente) {
      await this.jogoRepo.criar({
        faseId,
        timeCasaId: timeCasaId ?? tbdId,
        timeForaId: timeForaId ?? tbdId,
        dataHora: new Date(entrada.dataHora),
        rodada: entrada.rodada,
        status: 'AGENDADO',
        golsCasa: null,
        golsFora: null,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId: null,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        externoId: null,
        criadoPor: 'sistema-chaveamento',
      });
      return { criado: true, atualizado: false };
    }

    // Jogo existe — atualizar TBD se agora temos o time
    const updateData: Record<string, string> = {};
    if (jogoExistente.timeCasaId === tbdId && timeCasaId) {
      updateData.timeCasaId = timeCasaId;
    }
    if (jogoExistente.timeForaId === tbdId && timeForaId) {
      updateData.timeForaId = timeForaId;
    }
    if (Object.keys(updateData).length === 0)
      return { criado: false, atualizado: false };

    await this.jogoRepo.atualizar(jogoExistente.id, updateData);
    return { criado: false, atualizado: true };
  }

  private montarResumoChaveamento(
    classificacao: ClassificacaoMap,
    siglaMap: Map<string, string>,
  ): string {
    const partes: string[] = [];
    for (const entrada of COPA_CHAVEAMENTO_16AVOS) {
      const casaId = this.resolverPosicao(entrada.casa, classificacao);
      const foraId = this.resolverPosicao(entrada.fora, classificacao);
      const casa = casaId ? (siglaMap.get(casaId) ?? '?') : entrada.casa;
      const fora = foraId ? (siglaMap.get(foraId) ?? '?') : entrada.fora;
      if (casaId || foraId) {
        partes.push(`R${entrada.rodada}: ${casa} x ${fora}`);
      }
    }
    return partes.join(' | ');
  }

  /**
   * Propaga vencedores de uma fase para a próxima usando o bracket.
   * Chamado após qualquer jogo de mata-mata ser finalizado.
   */
  async propagarVencedoresParaProximaFase(temporadaId: string): Promise<void> {
    const fases = await this.faseRepo.buscarPorTemporada(temporadaId);
    const fasesMataMata = (fases as FaseBasica[])
      .filter((f) => f.tipo === 'MATA_MATA')
      .sort((a, b) => a.ordem - b.ordem);

    if (fasesMataMata.length < 2) return;

    const tbdId = await this.garantirTimeTBD();

    const faseSemis = fasesMataMata.find((f) =>
      f.nome.toLowerCase().includes('semi'),
    );
    const faseTerceiro = fasesMataMata.find(
      (f) =>
        f.nome.toLowerCase().includes('3') ||
        f.nome.toLowerCase().includes('terceiro'),
    );
    const faseFinal = fasesMataMata.find(
      (f) =>
        f.nome.toLowerCase().includes('final') &&
        !f.nome.toLowerCase().includes('semi'),
    );

    for (let i = 0; i < fasesMataMata.length - 1; i++) {
      const faseAtual = fasesMataMata[i];
      const faseProxima = fasesMataMata[i + 1];

      // 3º lugar e final são alimentados pelas semis, não pela fase anterior no array
      const ehTerceiroLugar = faseProxima.id === faseTerceiro?.id;
      const ehFinal = faseProxima.id === faseFinal?.id;

      if (ehTerceiroLugar || ehFinal) continue;

      const bracket = this.obterBracketParaFase(faseProxima.nome);
      if (!bracket) continue;

      await this.propagarEntresFases(
        faseAtual.id,
        faseProxima.id,
        bracket,
        tbdId,
        false,
      );
    }

    // 3º lugar: perdedores das semifinais
    if (faseSemis && faseTerceiro) {
      const bracket = this.obterBracketParaFase(faseTerceiro.nome);
      if (bracket) {
        await this.propagarEntresFases(
          faseSemis.id,
          faseTerceiro.id,
          bracket,
          tbdId,
          true,
        );
      }
    }

    // Final: vencedores das semifinais
    if (faseSemis && faseFinal) {
      const bracket = this.obterBracketParaFase(faseFinal.nome);
      if (bracket) {
        await this.propagarEntresFases(
          faseSemis.id,
          faseFinal.id,
          bracket,
          tbdId,
          false,
        );
      }
    }
  }

  private obterBracketParaFase(nomeFase: string):
    | {
        rodada: number;
        casaOrigem: number;
        foraOrigem: number;
        dataHora: string;
      }[]
    | null {
    const nome = nomeFase.toLowerCase();
    if (nome.includes('oitavas')) return COPA_BRACKET_OITAVAS;
    if (nome.includes('quartas')) return COPA_BRACKET_QUARTAS;
    if (nome.includes('semi')) return COPA_BRACKET_SEMIS;
    if (nome.includes('3') || nome.includes('terceiro'))
      return COPA_BRACKET_TERCEIRO;
    if (nome.includes('final') && !nome.includes('semi'))
      return COPA_BRACKET_FINAL;
    return null;
  }

  private async propagarEntresFases(
    faseOrigemId: string,
    faseDestinoId: string,
    bracket: {
      rodada: number;
      casaOrigem: number;
      foraOrigem: number;
      dataHora: string;
    }[],
    tbdId: string,
    usarPerdedores: boolean,
  ): Promise<void> {
    const jogosOrigem = (await this.jogoRepo.buscarPorFase(
      faseOrigemId,
    )) as JogoOrigem[];
    const jogosDestino = (await this.jogoRepo.buscarPorFase(
      faseDestinoId,
    )) as JogoDestino[];

    const origemPorRodada = new Map(jogosOrigem.map((j) => [j.rodada, j]));
    const destinoPorRodada = new Map(jogosDestino.map((j) => [j.rodada, j]));

    for (const entrada of bracket) {
      await this.processarEntradaBracket(
        entrada,
        faseDestinoId,
        origemPorRodada,
        destinoPorRodada,
        tbdId,
        usarPerdedores,
      );
    }
  }

  private async processarEntradaBracket(
    entrada: {
      rodada: number;
      casaOrigem: number;
      foraOrigem: number;
      dataHora: string;
    },
    faseDestinoId: string,
    origemPorRodada: Map<number | null, JogoOrigem>,
    destinoPorRodada: Map<number | null, JogoDestino>,
    tbdId: string,
    usarPerdedores: boolean,
  ): Promise<void> {
    const jogoCasa = origemPorRodada.get(entrada.casaOrigem);
    const jogoFora = origemPorRodada.get(entrada.foraOrigem);

    const classificadoCasa = this.obterClassificado(jogoCasa, usarPerdedores);
    const classificadoFora = this.obterClassificado(jogoFora, usarPerdedores);

    if (!classificadoCasa && !classificadoFora) return;

    const jogoDestino = destinoPorRodada.get(entrada.rodada);

    if (!jogoDestino) {
      await this.criarJogoProximaFase(
        faseDestinoId,
        entrada,
        classificadoCasa,
        classificadoFora,
        tbdId,
      );
      this.logger.log(`🏗️ Jogo R${entrada.rodada} criado na próxima fase`);
      return;
    }

    // Atualizar TBD com classificado
    const updateData: Record<string, string> = {};
    if (jogoDestino.timeCasaId === tbdId && classificadoCasa) {
      updateData.timeCasaId = classificadoCasa;
    }
    if (jogoDestino.timeForaId === tbdId && classificadoFora) {
      updateData.timeForaId = classificadoFora;
    }
    if (Object.keys(updateData).length > 0) {
      await this.jogoRepo.atualizar(jogoDestino.id, updateData);
    }
  }

  /**
   * Retorna o time classificado de um jogo finalizado.
   * Se usarPerdedores=true, retorna o time que NÃO é o vencedor.
   */
  private obterClassificado(
    jogo: JogoOrigem | undefined,
    usarPerdedores: boolean,
  ): string | null {
    if (jogo?.status !== 'FINALIZADO' || !jogo?.vencedorId) return null;

    if (!usarPerdedores) return jogo.vencedorId;

    // Perdedor = o time que não é o vencedor
    return jogo.vencedorId === jogo.timeCasaId
      ? jogo.timeForaId
      : jogo.timeCasaId;
  }

  private async criarJogoProximaFase(
    faseId: string,
    entrada: { rodada: number; dataHora: string },
    vencedorCasa: string | null,
    vencedorFora: string | null,
    tbdId: string,
  ): Promise<void> {
    await this.jogoRepo.criar({
      faseId,
      timeCasaId: vencedorCasa ?? tbdId,
      timeForaId: vencedorFora ?? tbdId,
      dataHora: new Date(entrada.dataHora),
      rodada: entrada.rodada,
      status: 'AGENDADO',
      golsCasa: null,
      golsFora: null,
      temProrrogacao: false,
      golsProrrogacaoCasa: null,
      golsProrrogacaoFora: null,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      vencedorId: null,
      ehJogoVolta: false,
      grupoIdaVolta: null,
      fonteResultado: 'API_EXTERNA',
      externoId: null,
      criadoPor: 'sistema-chaveamento',
    });
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
          this.logger.log(
            `🌐 GE reconheceu jogo R${jogoLocal.rodada}: ${normalizado.timeCasa?.sigla ?? '?'} x ${normalizado.timeFora?.sigla ?? '?'} (externoId vinculado)`,
          );
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
      const time = (await this.timeRepo.buscarPorId(timeId)) as {
        sigla: string;
      } | null;
      if (time) siglaMap.set(timeId, time.sigla);
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
    const fasesGrupos = (fases as FaseBasica[]).filter(
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
    const existente = (await this.timeRepo.buscarPorExternoId(
      timeData.externoId,
    )) as { id: string } | null;
    if (existente) return existente;

    return (await this.timeRepo.criar({
      nome: timeData.nome,
      sigla: timeData.sigla,
      escudo: timeData.escudo ?? null,
      externoId: timeData.externoId,
    })) as { id: string };
  }
}

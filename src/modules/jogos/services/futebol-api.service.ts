import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiExternaIndisponivelError } from '../../../common/errors/domain-errors';
import {
  GE_BASE_URL,
  BRASILEIRAO_CAMPEONATO_ID,
  type CampeonatoConfig,
} from '../jogos.constants';
import { API_EXTERNA_CONFIG } from '../../scheduler/scheduler.constants';
import type {
  JogoApiRaw,
  JogoNormalizado,
  ClassificacaoItem,
  ClassificacaoGeRawGrupo,
  ClassificacaoGeRawItem,
  ClassificacaoGeRawEnvelope,
  SecaoRaw,
  SecaoJogoRaw,
  ClassificacaoEliminatoriaRaw,
} from './futebol-api.types';

@Injectable()
export class FutebolApiService implements OnModuleInit {
  private readonly logger = new Logger(FutebolApiService.name);

  onModuleInit() {
    this.logger.log(
      'Integração com API de futebol (ge.globo.com) inicializada',
    );
  }

  async buscarClassificacao(season: number): Promise<ClassificacaoItem[]> {
    const resultado = await this.buscarClassificacaoGe(season);
    if (resultado.length > 0) return resultado;

    return this.buscarClassificacaoPacote();
  }

  /**
   * Rodada oficial publicada pela API do GE (`rodada.atual` no envelope de classificação).
   * Usada para alinhar sync/listagem quando o banco tem remarcações de rodadas antigas.
   */
  async buscarRodadaOficialGe(
    season: number = new Date().getFullYear(),
  ): Promise<number | null> {
    const data = await this.buscarEnvelopeClassificacaoGe(season);
    if (!data) return null;

    const atual = (data as ClassificacaoGeRawEnvelope).rodada?.atual;
    return typeof atual === 'number' && atual > 0 ? atual : null;
  }

  private async buscarClassificacaoGe(
    season: number,
  ): Promise<ClassificacaoItem[]> {
    const data = await this.buscarEnvelopeClassificacaoGe(season);
    if (!data) return [];

    return this.extrairClassificacaoGe(data);
  }

  /**
   * Fetch único do endpoint de classificação do Brasileirão na GE.
   * Reutilizado por classificação e pela leitura de `rodada.atual`.
   */
  private async buscarEnvelopeClassificacaoGe(
    season: number,
  ): Promise<unknown> {
    const fase = `fase-unica-campeonato-brasileiro-${season}`;
    const url = `${GE_BASE_URL}/${BRASILEIRAO_CAMPEONATO_ID}/fase/${fase}/classificacao/`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(API_EXTERNA_CONFIG.TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(
          `Classificação GE indisponível: status ${response.status}`,
        );
        return null;
      }

      return await response.json();
    } catch (error) {
      this.logger.warn('Erro ao buscar classificação da API GE', error);
      return null;
    }
  }

  /**
   * A API do GE já retornou array de grupos (`[{ classificacao: [...] }]`)
   * e, nas temporadas recentes, um envelope (`{ classificacao: [...] }`).
   */
  private extrairClassificacaoGe(data: unknown): ClassificacaoItem[] {
    if (Array.isArray(data)) {
      return this.mapearClassificacaoGe(data as ClassificacaoGeRawGrupo[]);
    }

    if (!data || typeof data !== 'object') return [];

    const envelope = data as ClassificacaoGeRawEnvelope;
    const itens = envelope.classificacao;
    if (!Array.isArray(itens) || itens.length === 0) return [];

    if (this.ehItemClassificacao(itens[0])) {
      return (itens as ClassificacaoGeRawItem[]).map((item) =>
        this.mapearItemClassificacaoGe(item),
      );
    }

    return this.mapearClassificacaoGe(itens as ClassificacaoGeRawGrupo[]);
  }

  private ehItemClassificacao(item: unknown): item is ClassificacaoGeRawItem {
    if (!item || typeof item !== 'object') return false;
    return 'equipe_id' in item || 'ordem' in item;
  }

  private mapearClassificacaoGe(
    grupos: ClassificacaoGeRawGrupo[],
  ): ClassificacaoItem[] {
    const resultado: ClassificacaoItem[] = [];

    for (const grupo of grupos) {
      if (!grupo.classificacao || !Array.isArray(grupo.classificacao)) continue;

      for (const item of grupo.classificacao) {
        resultado.push(this.mapearItemClassificacaoGe(item));
      }
    }

    return resultado;
  }

  private mapearItemClassificacaoGe(
    item: ClassificacaoGeRawItem,
  ): ClassificacaoItem {
    return {
      posicao: item.ordem,
      timeId: String(item.equipe_id),
      nome: item.nome_popular || item.nome || '',
      sigla: item.sigla || '',
      escudo: item.escudo || null,
      pontos: item.pontos ?? 0,
      jogos: item.jogos ?? 0,
      vitorias: item.vitorias ?? 0,
      empates: item.empates ?? 0,
      derrotas: item.derrotas ?? 0,
      golsPro: item.gols_pro ?? 0,
      golsContra: item.gols_contra ?? 0,
      saldoGols: item.saldo_gols ?? 0,
      recentForm: item.ultimos_jogos ?? [],
    };
  }

  private async buscarClassificacaoPacote(): Promise<ClassificacaoItem[]> {
    try {
      const { getStandings } = await import('campeonato-brasileiro-api');
      const standings = await getStandings('a');

      if (!standings?.tables?.[0]?.entries) return [];

      return standings.tables[0].entries.map(
        (entry): ClassificacaoItem => ({
          posicao: entry.position,
          timeId: String(entry.team.id),
          nome: entry.team.name,
          sigla: entry.team.shortName,
          escudo: entry.team.badge || null,
          pontos: entry.points ?? 0,
          jogos: entry.matches ?? 0,
          vitorias: entry.wins ?? 0,
          empates: entry.draws ?? 0,
          derrotas: entry.losses ?? 0,
          golsPro: entry.goalsFor ?? 0,
          golsContra: entry.goalsAgainst ?? 0,
          saldoGols: entry.goalDifference ?? 0,
          recentForm: entry.recentForm ?? [],
        }),
      );
    } catch (error) {
      this.logger.warn('Erro ao buscar classificação via pacote', error);
      return [];
    }
  }

  async buscarJogosPorRodada(
    campeonatoId: string,
    faseSlug: string,
    rodada: number,
  ): Promise<JogoApiRaw[]> {
    const url = `${GE_BASE_URL}/${campeonatoId}/fase/${faseSlug}/rodada/${rodada}/jogos/`;
    return this.fetchJogos(url);
  }

  async buscarJogosPorIds(
    ids: number[],
    config: CampeonatoConfig,
  ): Promise<JogoApiRaw[]> {
    if (ids.length === 0) return [];

    const idsSet = new Set(ids);
    const encontrados: JogoApiRaw[] = [];

    for (const fase of config.fases) {
      if (idsSet.size === 0) break;
      await this.buscarIdsPorFase(config, fase, idsSet, encontrados);
    }

    return encontrados;
  }

  private async buscarIdsPorFase(
    config: CampeonatoConfig,
    fase: { slug: string; maxRodadas: number },
    idsSet: Set<number>,
    encontrados: JogoApiRaw[],
  ): Promise<void> {
    for (let rodada = 1; rodada <= fase.maxRodadas; rodada++) {
      if (idsSet.size === 0) break;

      try {
        const faseSlugCompleto = config.buildFaseSlug(fase.slug);
        const jogos = await this.buscarJogosPorRodada(
          config.campeonatoId,
          faseSlugCompleto,
          rodada,
        );
        for (const jogo of jogos) {
          if (idsSet.has(jogo.id)) {
            encontrados.push(jogo);
            idsSet.delete(jogo.id);
          }
        }
      } catch {
        continue;
      }
    }
  }

  async buscarJogosPorRodadas(
    campeonatoId: string,
    faseSlug: string,
    rodadas: number[],
  ): Promise<JogoApiRaw[]> {
    if (rodadas.length === 0) return [];

    if (this.ehFaseEliminatoriaCopa(faseSlug)) {
      return this.buscarJogosEliminatorios(campeonatoId, faseSlug);
    }

    const resultados = await Promise.allSettled(
      rodadas.map((rodada) =>
        this.buscarJogosPorRodada(campeonatoId, faseSlug, rodada),
      ),
    );

    const encontrados: JogoApiRaw[] = [];
    let falhas = 0;

    for (const resultado of resultados) {
      if (resultado.status === 'fulfilled') {
        encontrados.push(...resultado.value);
      } else {
        falhas++;
      }
    }

    if (falhas === rodadas.length) {
      throw new ApiExternaIndisponivelError();
    }

    return encontrados;
  }

  /**
   * Verifica se o slug corresponde a uma fase eliminatória da Copa.
   * Fases eliminatórias usam endpoint /classificacao/ ao invés de /rodada/X/jogos/.
   */
  private ehFaseEliminatoriaCopa(faseSlug: string): boolean {
    const slugsEliminatorios = [
      'segunda-fase',
      'oitavas',
      'quartas',
      'semifinal',
      'terceiro',
      'final-copa',
    ];
    return slugsEliminatorios.some((s) => faseSlug.includes(s));
  }

  /**
   * Busca jogos de fases eliminatórias da Copa via endpoint /classificacao/.
   * A API do GE não expõe jogos de mata-mata via /rodada/X/jogos/,
   * mas retorna tudo no endpoint de classificação com estrutura de chaves.
   */
  async buscarJogosEliminatorios(
    campeonatoId: string,
    faseSlug: string,
  ): Promise<JogoApiRaw[]> {
    const url = `${GE_BASE_URL}/${campeonatoId}/fase/${faseSlug}/classificacao/`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        API_EXTERNA_CONFIG.TIMEOUT_MS,
      );

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          `Segunda fase GE indisponível: status ${response.status}`,
        );
        return [];
      }

      const data = (await response.json()) as ClassificacaoEliminatoriaRaw;
      const secoes = data?.secao;
      if (!Array.isArray(secoes)) return [];

      return this.extrairJogosDeSecoes(secoes);
    } catch (error) {
      this.logger.warn('Erro ao buscar segunda fase da API GE', error);
      return [];
    }
  }

  private extrairJogosDeSecoes(secoes: SecaoRaw[]): JogoApiRaw[] {
    return secoes
      .flatMap((secao) => secao.chave ?? [])
      .flatMap((chave) => chave.jogos ?? [])
      .map((jogo) => this.formatarJogoSegundaFase(jogo))
      .filter((jogo): jogo is JogoApiRaw => jogo !== null);
  }

  private formatarJogoSegundaFase(jogo: SecaoJogoRaw): JogoApiRaw | null {
    if (!jogo.id) return null;
    if (!jogo.equipes?.mandante?.id || !jogo.equipes?.visitante?.id)
      return null;

    const dataCompleta = jogo.hora_realizacao
      ? `${jogo.data_realizacao}T${jogo.hora_realizacao}`
      : (jogo.data_realizacao ?? null);

    return {
      ...(jogo as unknown as JogoApiRaw),
      data_realizacao: dataCompleta,
    };
  }

  private async fetchJogos(url: string): Promise<JogoApiRaw[]> {
    for (
      let tentativa = 0;
      tentativa <= API_EXTERNA_CONFIG.MAX_RETRIES;
      tentativa++
    ) {
      const resultado = await this.tentarFetch(url, tentativa);
      if (resultado !== null) return resultado;
    }

    throw new ApiExternaIndisponivelError();
  }

  private async tentarFetch(
    url: string,
    tentativa: number,
  ): Promise<JogoApiRaw[] | null> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(API_EXTERNA_CONFIG.TIMEOUT_MS),
      });

      if (response.ok) {
        const data: unknown = await response.json();
        return Array.isArray(data) ? (data as JogoApiRaw[]) : [];
      }

      return this.tratarErroResponse(response.status, tentativa);
    } catch (error) {
      return this.tratarErroRede(error, tentativa);
    }
  }

  private async tratarErroResponse(
    status: number,
    tentativa: number,
  ): Promise<null> {
    if (API_EXTERNA_CONFIG.ERROS_DEFINITIVOS.includes(status)) {
      this.logger.error(`API externa retornou ${status} (definitivo)`);
      throw new ApiExternaIndisponivelError();
    }

    if (tentativa < API_EXTERNA_CONFIG.MAX_RETRIES) {
      this.logger.warn(
        `API externa retornou ${status}, retry ${tentativa + 1}/${API_EXTERNA_CONFIG.MAX_RETRIES}`,
      );
      await this.sleep(API_EXTERNA_CONFIG.BACKOFF_MS[tentativa]);
      return null;
    }

    throw new ApiExternaIndisponivelError();
  }

  private async tratarErroRede(
    error: unknown,
    tentativa: number,
  ): Promise<null> {
    if (error instanceof ApiExternaIndisponivelError) throw error;

    if (tentativa >= API_EXTERNA_CONFIG.MAX_RETRIES) {
      this.logger.error('API externa indisponível após retries', error);
      throw new ApiExternaIndisponivelError();
    }

    this.logger.warn(
      `Erro na API externa, retry ${tentativa + 1}/${API_EXTERNA_CONFIG.MAX_RETRIES}`,
    );
    await this.sleep(API_EXTERNA_CONFIG.BACKOFF_MS[tentativa]);
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  normalizarJogo(jogo: JogoApiRaw): JogoNormalizado {
    const dataHoraUtc = this.converterDataParaUtc(jogo.data_realizacao);
    const status = dataHoraUtc ? this.mapearStatus(jogo) : 'ADIADO';
    const comPlacar = status === 'FINALIZADO' || status === 'EM_ANDAMENTO';

    return {
      externoId: String(jogo.id),
      dataHora: dataHoraUtc,
      status,
      timeCasaId: String(jogo.equipes.mandante.id),
      timeForaId: String(jogo.equipes.visitante.id),
      golsCasa: comPlacar ? (jogo.placar_oficial_mandante ?? null) : null,
      golsFora: comPlacar ? (jogo.placar_oficial_visitante ?? null) : null,
      penaltisCasa: jogo.placar_penaltis_mandante ?? null,
      penaltisFora: jogo.placar_penaltis_visitante ?? null,
      timeCasa: {
        externoId: String(jogo.equipes.mandante.id),
        nome: jogo.equipes.mandante.nome_popular,
        sigla: jogo.equipes.mandante.sigla,
        escudo: jogo.equipes.mandante.escudo,
      },
      timeFora: {
        externoId: String(jogo.equipes.visitante.id),
        nome: jogo.equipes.visitante.nome_popular,
        sigla: jogo.equipes.visitante.sigla,
        escudo: jogo.equipes.visitante.escudo,
      },
    };
  }

  private converterDataParaUtc(dataHoraBrt: string | null): string | null {
    if (!dataHoraBrt) return null;

    const jaTemTimezone = /[Zz]$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(
      dataHoraBrt.trim(),
    );

    return jaTemTimezone
      ? new Date(dataHoraBrt).toISOString()
      : new Date(`${dataHoraBrt}-03:00`).toISOString();
  }

  mapearStatus(jogo: JogoApiRaw): string {
    const broadcastId = jogo.transmissao?.broadcast?.id;

    if (broadcastId === 'ENCERRADA') return 'FINALIZADO';
    if (
      jogo.jogo_ja_comecou ||
      broadcastId === 'LIVE' ||
      broadcastId === 'AO_VIVO'
    ) {
      return 'EM_ANDAMENTO';
    }

    return 'AGENDADO';
  }
}

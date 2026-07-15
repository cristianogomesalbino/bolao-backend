import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiExternaIndisponivelError } from '../../../common/errors/domain-errors';
import {
  GE_BASE_URL,
  BRASILEIRAO_CAMPEONATO_ID,
  type CampeonatoConfig,
} from '../jogos.constants';

@Injectable()
export class FutebolApiService implements OnModuleInit {
  private readonly logger = new Logger(FutebolApiService.name);

  onModuleInit() {
    this.logger.log(
      'Integração com API de futebol (ge.globo.com) inicializada',
    );
  }

  async buscarClassificacao(season: number): Promise<any[]> {
    const resultado = await this.buscarClassificacaoGe(season);
    if (resultado.length > 0) return resultado;

    return this.buscarClassificacaoPacote();
  }

  private async buscarClassificacaoGe(season: number): Promise<any[]> {
    const fase = `fase-unica-campeonato-brasileiro-${season}`;
    const url = `${GE_BASE_URL}/${BRASILEIRAO_CAMPEONATO_ID}/fase/${fase}/classificacao/`;

    try {
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        this.logger.warn(
          `Classificação GE indisponível: status ${response.status}`,
        );
        return [];
      }

      const data = await response.json();

      if (!Array.isArray(data)) return [];

      const resultado: any[] = [];
      for (const grupo of data) {
        if (grupo.classificacao && Array.isArray(grupo.classificacao)) {
          for (const item of grupo.classificacao) {
            resultado.push({
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
            });
          }
        }
      }

      return resultado;
    } catch (error) {
      this.logger.warn('Erro ao buscar classificação da API GE', error);
      return [];
    }
  }

  private async buscarClassificacaoPacote(): Promise<any[]> {
    try {
      const { getStandings } = await import('campeonato-brasileiro-api');
      const standings = await getStandings('a');

      if (!standings?.tables?.[0]?.entries) return [];

      return standings.tables[0].entries.map((entry: any) => ({
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
      }));
    } catch (error) {
      this.logger.warn('Erro ao buscar classificação via pacote', error);
      return [];
    }
  }

  async buscarJogosPorRodada(
    campeonatoId: string,
    faseSlug: string,
    rodada: number,
  ): Promise<any[]> {
    const url = `${GE_BASE_URL}/${campeonatoId}/fase/${faseSlug}/rodada/${rodada}/jogos/`;
    return this.fetchJogos(url);
  }

  async buscarJogosPorIds(
    ids: number[],
    config: CampeonatoConfig,
  ): Promise<any[]> {
    if (ids.length === 0) return [];

    const idsSet = new Set(ids);
    const encontrados: any[] = [];

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
    encontrados: any[],
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
  ): Promise<any[]> {
    if (rodadas.length === 0) return [];

    // Para fases eliminatórias da Copa, usar endpoint /classificacao/
    if (this.ehFaseEliminatoriaCopa(faseSlug)) {
      return this.buscarJogosEliminatorios(campeonatoId, faseSlug);
    }

    const resultados = await Promise.allSettled(
      rodadas.map((rodada) =>
        this.buscarJogosPorRodada(campeonatoId, faseSlug, rodada),
      ),
    );

    const encontrados: any[] = [];
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
  ): Promise<any[]> {
    const url = `${GE_BASE_URL}/${campeonatoId}/fase/${faseSlug}/classificacao/`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

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

      const data = await response.json();
      const secoes = data?.secao;
      if (!Array.isArray(secoes)) return [];

      const jogos = this.extrairJogosDeSecoes(secoes);

      return jogos;
    } catch (error) {
      this.logger.warn('Erro ao buscar segunda fase da API GE', error);
      return [];
    }
  }

  private extrairJogosDeSecoes(secoes: any[]): any[] {
    const jogos: any[] = [];

    for (const secao of secoes) {
      if (!Array.isArray(secao.chave)) continue;
      for (const chave of secao.chave) {
        if (!Array.isArray(chave.jogos)) continue;
        for (const jogo of chave.jogos) {
          const jogoFormatado = this.formatarJogoSegundaFase(jogo);
          if (jogoFormatado) jogos.push(jogoFormatado);
        }
      }
    }

    return jogos;
  }

  private formatarJogoSegundaFase(jogo: any): any | null {
    if (!jogo.id) return null;
    if (!jogo.equipes?.mandante?.id || !jogo.equipes?.visitante?.id)
      return null;

    const dataCompleta = jogo.hora_realizacao
      ? `${jogo.data_realizacao}T${jogo.hora_realizacao}`
      : jogo.data_realizacao;

    return { ...jogo, data_realizacao: dataCompleta };
  }

  private async fetchJogos(url: string): Promise<any[]> {
    const maxRetries = 2;
    const backoff = [1000, 3000];

    for (let tentativa = 0; tentativa <= maxRetries; tentativa++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(10_000),
        });

        if (response.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }

        // Erros definitivos — não repetir
        if ([400, 401, 403, 404].includes(response.status)) {
          this.logger.error(
            `API externa retornou ${response.status} (definitivo)`,
          );
          throw new ApiExternaIndisponivelError();
        }

        // Erros retryable — tentar novamente
        if (tentativa < maxRetries) {
          this.logger.warn(
            `API externa retornou ${response.status}, retry ${tentativa + 1}/${maxRetries}`,
          );
          await this.sleep(backoff[tentativa]);
          continue;
        }

        throw new ApiExternaIndisponivelError();
      } catch (error) {
        if (error instanceof ApiExternaIndisponivelError) throw error;

        if (tentativa >= maxRetries) {
          this.logger.error(
            'API externa indisponível após retries',
            error,
          );
          throw new ApiExternaIndisponivelError();
        }

        this.logger.warn(
          `Erro na API externa, retry ${tentativa + 1}/${maxRetries}`,
        );
        await this.sleep(backoff[tentativa]);
      }
    }

    throw new ApiExternaIndisponivelError();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  normalizarJogo(jogo: any): any {
    const status = this.mapearStatus(jogo);

    const dataHoraBrt = jogo.data_realizacao;
    let dataHoraUtc: string | null = null;
    if (dataHoraBrt) {
      const jaTemTimezone = /[Zz]$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(
        dataHoraBrt.trim(),
      );
      dataHoraUtc = jaTemTimezone
        ? new Date(dataHoraBrt).toISOString()
        : new Date(`${dataHoraBrt}-03:00`).toISOString();
    }

    return {
      externoId: String(jogo.id),
      dataHora: dataHoraUtc,
      status: dataHoraUtc ? status : 'ADIADO',
      timeCasaId: String(jogo.equipes.mandante.id),
      timeForaId: String(jogo.equipes.visitante.id),
      golsCasa:
        status === 'FINALIZADO' || status === 'EM_ANDAMENTO'
          ? (jogo.placar_oficial_mandante ?? null)
          : null,
      golsFora:
        status === 'FINALIZADO' || status === 'EM_ANDAMENTO'
          ? (jogo.placar_oficial_visitante ?? null)
          : null,
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

  mapearStatus(jogo: any): string {
    const broadcastId = jogo.transmissao?.broadcast?.id;

    if (broadcastId === 'ENCERRADA') {
      return 'FINALIZADO';
    }

    if (jogo.jogo_ja_comecou) {
      return 'EM_ANDAMENTO';
    }

    return 'AGENDADO';
  }
}

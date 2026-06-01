import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiExternaIndisponivelError } from '../../../common/errors/domain-errors';

const GE_BASE_URL = 'https://api.globoesporte.globo.com/tabela';
const BRASILEIRAO_CAMPEONATO_ID = 'd1a37fa4-e948-43a6-ba53-ab24ab3a45b1';

@Injectable()
export class FutebolApiService implements OnModuleInit {
  private readonly logger = new Logger(FutebolApiService.name);

  onModuleInit() {
    this.logger.log('Integração com API de futebol (ge.globo.com) inicializada');
  }

  async buscarClassificacao(season: number): Promise<any[]> {
    // Tentar API do ge.globo.com primeiro
    const resultado = await this.buscarClassificacaoGe(season);
    if (resultado.length > 0) return resultado;

    // Fallback: pacote campeonato-brasileiro-api
    return this.buscarClassificacaoPacote();
  }

  private async buscarClassificacaoGe(season: number): Promise<any[]> {
    const fase = `fase-unica-campeonato-brasileiro-${season}`;
    const url = `${GE_BASE_URL}/${BRASILEIRAO_CAMPEONATO_ID}/fase/${fase}/classificacao/`;

    try {
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        this.logger.warn(`Classificação GE indisponível: status ${response.status}`);
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

  async buscarJogosPorRodada(season: number, rodada: number): Promise<any[]> {
    const fase = `fase-unica-campeonato-brasileiro-${season}`;
    const url = `${GE_BASE_URL}/${BRASILEIRAO_CAMPEONATO_ID}/fase/${fase}/rodada/${rodada}/jogos/`;

    return this.fetchJogos(url);
  }

  async buscarJogosPorIds(ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];

    // ge.globo.com não tem endpoint por IDs — buscar todas as rodadas necessárias
    // Para sync, iteramos rodadas 1-38 até encontrar todos os IDs
    const idsSet = new Set(ids);
    const encontrados: any[] = [];

    for (let rodada = 1; rodada <= 38; rodada++) {
      if (idsSet.size === 0) break;

      try {
        const jogos = await this.buscarJogosPorRodada(new Date().getFullYear(), rodada);
        for (const jogo of jogos) {
          if (idsSet.has(jogo.id)) {
            encontrados.push(jogo);
            idsSet.delete(jogo.id);
          }
        }
      } catch {
        // Rodada pode não existir ainda, continuar
        continue;
      }
    }

    return encontrados;
  }

  async buscarJogosPorRodadas(rodadas: number[]): Promise<any[]> {
    if (rodadas.length === 0) return [];

    const season = new Date().getFullYear();
    const encontrados: any[] = [];
    let falhas = 0;

    for (const rodada of rodadas) {
      try {
        const jogos = await this.buscarJogosPorRodada(season, rodada);
        encontrados.push(...jogos);
      } catch {
        falhas++;
        continue;
      }
    }

    // Se todas as rodadas falharam, a API está indisponível
    if (falhas === rodadas.length) {
      throw new ApiExternaIndisponivelError();
    }

    return encontrados;
  }

  private async fetchJogos(url: string): Promise<any[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.error(`API externa retornou status ${response.status}`);
        throw new ApiExternaIndisponivelError();
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error instanceof ApiExternaIndisponivelError) {
        throw error;
      }
      this.logger.error('Erro ao comunicar com API externa de futebol', error);
      throw new ApiExternaIndisponivelError();
    }
  }

  normalizarJogo(jogo: any): any {
    const status = this.mapearStatus(jogo);

    // A API do ge.globo.com retorna data_realizacao em BRT (sem timezone)
    // Jogos adiados têm data_realizacao = null
    // Alguns jogos podem vir com timezone (Z ou offset) — detectar e não aplicar -03:00 novamente
    const dataHoraBrt = jogo.data_realizacao;
    let dataHoraUtc: string | null = null;
    if (dataHoraBrt) {
      const jaTemTimezone = /[Zz]$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(dataHoraBrt.trim());
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
      golsCasa: (status === 'FINALIZADO' || status === 'EM_ANDAMENTO') ? (jogo.placar_oficial_mandante ?? null) : null,
      golsFora: (status === 'FINALIZADO' || status === 'EM_ANDAMENTO') ? (jogo.placar_oficial_visitante ?? null) : null,
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

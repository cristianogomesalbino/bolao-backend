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

  private async fetchJogos(url: string): Promise<any[]> {
    try {
      const response = await fetch(url, { method: 'GET' });

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

    return {
      externoId: String(jogo.id),
      dataHora: jogo.data_realizacao,
      timeCasaId: String(jogo.equipes.mandante.id),
      timeForaId: String(jogo.equipes.visitante.id),
      golsCasa: status === 'FINALIZADO' ? (jogo.placar_oficial_mandante ?? null) : null,
      golsFora: status === 'FINALIZADO' ? (jogo.placar_oficial_visitante ?? null) : null,
      status,
      penaltisCasa: jogo.placar_penaltis_mandante ?? null,
      penaltisFora: jogo.placar_penaltis_visitante ?? null,
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

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiFootballIndisponivelError } from '../../common/errors/domain-errors';

const API_FOOTBALL_HOST = 'api-football-v1.p.rapidapi.com';
const API_FOOTBALL_BASE_URL = `https://${API_FOOTBALL_HOST}/v3`;

@Injectable()
export class ApiFootballService implements OnModuleInit {
  private readonly logger = new Logger(ApiFootballService.name);
  private apiKey: string;

  onModuleInit() {
    this.apiKey = process.env.RAPIDAPI_KEY ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'RAPIDAPI_KEY não configurada — integração com API-Football desabilitada',
      );
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'x-rapidapi-key': this.apiKey,
      'x-rapidapi-host': API_FOOTBALL_HOST,
    };
  }

  async buscarFixtures(leagueId: number, season: number): Promise<any[]> {
    this.validarApiKey();
    const url = `${API_FOOTBALL_BASE_URL}/fixtures?league=${leagueId}&season=${season}`;
    return this.fetchFixtures(url);
  }

  async buscarFixturesPorIds(ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];
    this.validarApiKey();
    const idsParam = ids.join('-');
    const url = `${API_FOOTBALL_BASE_URL}/fixtures?ids=${idsParam}`;
    return this.fetchFixtures(url);
  }

  private validarApiKey() {
    if (!this.apiKey) {
      throw new ApiFootballIndisponivelError();
    }
  }

  private async fetchFixtures(url: string): Promise<any[]> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        this.logger.error(`API-Football retornou status ${response.status}`);
        throw new ApiFootballIndisponivelError();
      }

      const data = await response.json();
      return data.response ?? [];
    } catch (error) {
      if (error instanceof ApiFootballIndisponivelError) {
        throw error;
      }
      this.logger.error('Erro ao comunicar com API-Football', error);
      throw new ApiFootballIndisponivelError();
    }
  }
}

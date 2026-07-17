declare module 'campeonato-brasileiro-api' {
  interface StandingTeam {
    id: number;
    name: string;
    shortName: string;
    badge?: string;
  }

  interface StandingEntry {
    position: number;
    team: StandingTeam;
    points?: number;
    matches?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    goalsFor?: number;
    goalsAgainst?: number;
    goalDifference?: number;
    recentForm?: string[];
  }

  interface StandingTable {
    entries?: StandingEntry[];
  }

  interface Standings {
    tables?: StandingTable[];
  }

  export function getStandings(serie: string): Promise<Standings>;
}

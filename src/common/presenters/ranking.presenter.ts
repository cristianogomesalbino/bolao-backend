interface RankingEntry {
  posicao: number;
  usuarioId: string;
  nomeUsuario: string;
  pontuacaoTotal: number;
  acertosEmCheio: number;
  acertosDeResultado: number;
  errosTotais: number;
}

export class RankingPresenter {
  static toHttp(entry: RankingEntry) {
    return {
      posicao: entry.posicao,
      usuarioId: entry.usuarioId,
      nomeUsuario: entry.nomeUsuario,
      pontuacaoTotal: entry.pontuacaoTotal,
      acertosEmCheio: entry.acertosEmCheio,
      acertosDeResultado: entry.acertosDeResultado,
      errosTotais: entry.errosTotais,
    };
  }
}

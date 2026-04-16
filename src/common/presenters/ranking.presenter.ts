export class RankingPresenter {
  static toHttp(entry: any) {
    return {
      posicao: entry.posicao,
      usuarioId: entry.usuarioId,
      nomeUsuario: entry.nomeUsuario,
      pontuacaoTotal: entry.pontuacaoTotal,
      acertosEmCheio: entry.acertosEmCheio,
      acertosDeResultado: entry.acertosDeResultado,
      acertosDeGolsUmTime: entry.acertosDeGolsUmTime,
      errosTotais: entry.errosTotais,
    };
  }
}

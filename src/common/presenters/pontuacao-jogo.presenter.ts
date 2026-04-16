export class PontuacaoJogoPresenter {
  static toHttp(entry: any) {
    return {
      usuarioId: entry.usuarioId,
      nomeUsuario: entry.nomeUsuario,
      golsCasaPalpite: entry.golsCasaPalpite,
      golsForaPalpite: entry.golsForaPalpite,
      categoriaAcerto: entry.categoriaAcerto,
      pontosBase: entry.pontosBase,
      multiplicador: entry.multiplicador,
      pontosFinais: entry.pontosFinais,
      dobrado: entry.dobrado,
    };
  }
}

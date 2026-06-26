interface PontuacaoJogoEntry {
  usuarioId: string;
  nomeUsuario: string;
  golsCasaPalpite: number | null;
  golsForaPalpite: number | null;
  categoriaAcerto: string | null;
  pontosBase: number | null;
  multiplicador: number;
  pontosFinais: number | null;
  dobrado: boolean;
}

export class PontuacaoJogoPresenter {
  static toHttp(entry: PontuacaoJogoEntry) {
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

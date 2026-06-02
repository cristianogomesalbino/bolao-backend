import {
  CAMPEONATO_CONFIGS,
  type TemaConfig,
} from '../../modules/jogos/jogos.constants';

interface CampeonatoData {
  id: string;
  nome: string;
  dataCriacao: Date;
  atualizadoEm: Date;
}

function obterTemaPorNome(nome: string): TemaConfig | null {
  const config = Object.values(CAMPEONATO_CONFIGS).find((c) => c.nome === nome);
  return config?.tema ?? null;
}

export class CampeonatoPresenter {
  static toHttp(campeonato: CampeonatoData) {
    const tema = obterTemaPorNome(campeonato.nome);
    return {
      id: campeonato.id,
      nome: campeonato.nome,
      dataCriacao: campeonato.dataCriacao,
      atualizadoEm: campeonato.atualizadoEm,
      ...(tema && { tema }),
    };
  }
}

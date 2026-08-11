import {
  CAMPEONATO_CONFIGS,
  type TemaConfig,
} from '../../modules/jogos/jogos.constants';

interface CampeonatoData {
  id: string;
  nome: string;
  status?: string;
  dataCriacao: Date;
  atualizadoEm: Date;
}

function obterTemaPorId(campeonatoId: string): TemaConfig | null {
  const config = Object.values(CAMPEONATO_CONFIGS).find(
    (c) => c.campeonatoId === campeonatoId,
  );
  return config?.tema ?? null;
}

export class CampeonatoPresenter {
  static toHttp(campeonato: CampeonatoData) {
    const tema = obterTemaPorId(campeonato.id);
    return {
      id: campeonato.id,
      nome: campeonato.nome,
      status: campeonato.status ?? 'EM_ANDAMENTO',
      dataCriacao: campeonato.dataCriacao,
      atualizadoEm: campeonato.atualizadoEm,
      ...(tema && { tema }),
    };
  }
}

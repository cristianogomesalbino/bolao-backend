import type { RankingEntry } from '../../ranking/services/ranking.service';
import type {
  TipoDestaque,
  JogoComTimes,
  GrupoBasico,
} from '../types/destaque.types';

export interface ResultadoMembro {
  usuarioId: string;
  nomeUsuario: string;
  categoriaAcerto: string | null;
  pontosBase: number;
}

export interface GeracaoContexto {
  jogo: JogoComTimes;
  grupo: GrupoBasico;
  palpiteMap: Map<string, { golsCasa: number; golsFora: number }>;
  dobradoSet: Set<string>;
  membrosNaMosca: ResultadoMembro[];
  unicoNaMosca: boolean;
  posicaoAnteriorMap: Map<string, number>;
  rankingAtual: Map<string, number>;
  rankingDepois: RankingEntry[];
  top5: Array<{ posicao: number; nome: string; pontuacao: number }>;
  resultados: ResultadoMembro[];
  ultimoTituloPorTipo: Map<TipoDestaque, string>;
  titulosUsadosPorTipo: Map<TipoDestaque, Set<string>>;
}

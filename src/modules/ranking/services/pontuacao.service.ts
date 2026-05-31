import { Injectable } from '@nestjs/common';
import { RANKING } from '../ranking.constants';

type CategoriaAcerto =
  | 'ACERTO_EM_CHEIO'
  | 'ACERTO_DE_RESULTADO'
  | 'ERRO_TOTAL';

interface ResultadoPontuacao {
  categoriaAcerto: CategoriaAcerto | null;
  pontosBase: number;
}

@Injectable()
export class PontuacaoService {
  calcular(
    palpite: { golsCasa: number; golsFora: number } | null,
    jogo: { golsCasa: number; golsFora: number },
  ): ResultadoPontuacao {
    if (palpite === null) {
      return { categoriaAcerto: null, pontosBase: 0 };
    }

    if (palpite.golsCasa === jogo.golsCasa && palpite.golsFora === jogo.golsFora) {
      return { categoriaAcerto: 'ACERTO_EM_CHEIO', pontosBase: RANKING.PONTOS.ACERTO_EM_CHEIO };
    }

    const resultadoPalpite = Math.sign(palpite.golsCasa - palpite.golsFora);
    const resultadoJogo = Math.sign(jogo.golsCasa - jogo.golsFora);

    if (resultadoPalpite === resultadoJogo) {
      return { categoriaAcerto: 'ACERTO_DE_RESULTADO', pontosBase: RANKING.PONTOS.ACERTO_DE_RESULTADO };
    }

    return { categoriaAcerto: 'ERRO_TOTAL', pontosBase: RANKING.PONTOS.ERRO_TOTAL };
  }
}

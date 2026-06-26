import { JogoPresenter } from './jogo.presenter';

interface JogoRelacao {
  id: string;
  faseId: string;
  rodada: number;
  timeCasaId: string;
  timeForaId: string;
  timeCasa?: {
    id: string;
    nome: string;
    sigla: string;
    escudo: string | null;
  } | null;
  timeFora?: {
    id: string;
    nome: string;
    sigla: string;
    escudo: string | null;
  } | null;
  dataHora: Date | null;
  status: string;
  foiAdiado: boolean;
  golsCasa: number | null;
  golsFora: number | null;
  vencedorId: string | null;
  dataCriacao: Date;
  atualizadoEm: Date;
}

interface PalpiteData {
  id: string;
  golsCasa: number;
  golsFora: number;
  jogoId: string;
  usuarioId: string;
  dataCriacao: Date;
  atualizadoEm: Date;
  jogo?: JogoRelacao | null;
}

export class PalpitePresenter {
  static toHttp(palpite: PalpiteData) {
    return {
      id: palpite.id,
      golsCasa: palpite.golsCasa,
      golsFora: palpite.golsFora,
      jogoId: palpite.jogoId,
      usuarioId: palpite.usuarioId,
      dataCriacao: palpite.dataCriacao,
      atualizadoEm: palpite.atualizadoEm,
    };
  }

  static toHttpComJogo(palpite: PalpiteData) {
    return {
      ...PalpitePresenter.toHttp(palpite),
      jogo: palpite.jogo ? JogoPresenter.toHttpResumido(palpite.jogo) : null,
    };
  }
}

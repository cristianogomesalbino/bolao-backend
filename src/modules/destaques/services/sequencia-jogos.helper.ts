import { DESTAQUES } from '../destaques.constants';
import type { PontuacaoService } from '../../ranking/services/pontuacao.service';
import type {
  JogoEsquecido,
  PlacarCravado,
  TimeInfo,
} from '../types/destaque.types';
import {
  ordenarJogosDaSequencia,
  type JogoParaSequencia,
} from './sequencia-resultado.calculo';

export interface JogoInternoSequencia {
  id: string;
  faseId: string;
  rodada: number | null;
  status: string;
  golsCasa: number | null;
  golsFora: number | null;
  timeCasaId: string;
  timeForaId: string;
  dataHora: Date | string | null;
  timeCasa?: { nome: string; sigla?: string; escudo?: string | null } | null;
  timeFora?: { nome: string; sigla?: string; escudo?: string | null } | null;
}

export interface PalpiteInternoSequencia {
  usuarioId: string;
  jogoId: string;
  golsCasa: number;
  golsFora: number;
}

export function filtrarFinalizadosOrdenados(
  jogos: JogoInternoSequencia[],
): JogoInternoSequencia[] {
  return jogos
    .filter((j) => j.status === 'FINALIZADO')
    .sort((a, b) => {
      const dataA = a.dataHora ? new Date(a.dataHora as string).getTime() : 0;
      const dataB = b.dataHora ? new Date(b.dataHora as string).getTime() : 0;
      return dataA - dataB;
    });
}

export function calcularRodadasParaConsulta(rodadaAtual: number): number[] {
  const rodadas: number[] = [];
  const limite = DESTAQUES.LIMITES.SEQUENCIA_RESULTADO_CONSULTA_RODADAS;
  for (let i = 0; i <= limite; i++) {
    const rodada = rodadaAtual - i;
    if (rodada >= 1) rodadas.push(rodada);
  }
  return rodadas;
}

export function timeInfoSequencia(
  time:
    | { nome: string; sigla?: string; escudo?: string | null }
    | null
    | undefined,
  fallbackId: string,
): TimeInfo {
  const nome = time?.nome ?? fallbackId;
  return {
    nome,
    sigla: time?.sigla ?? nome.slice(0, 3).toUpperCase(),
    escudo: time?.escudo ?? null,
  };
}

export function extrairCravadas(
  jogos: JogoInternoSequencia[],
  palpiteMap: Map<string, PalpiteInternoSequencia>,
  pontuacaoService: PontuacaoService,
): PlacarCravado[] {
  const cravadas: PlacarCravado[] = [];
  for (const jogo of jogos) {
    const palpite = palpiteMap.get(jogo.id);
    if (!palpite || jogo.golsCasa === null || jogo.golsFora === null) continue;
    const resultado = pontuacaoService.calcular(
      { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora },
      { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
    );
    if (resultado.categoriaAcerto !== 'ACERTO_EM_CHEIO') continue;
    cravadas.push({
      jogoId: jogo.id,
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
      timeCasa: timeInfoSequencia(jogo.timeCasa, jogo.timeCasaId),
      timeFora: timeInfoSequencia(jogo.timeFora, jogo.timeForaId),
    });
  }
  return cravadas;
}

export function extrairEsquecidos(
  jogos: JogoInternoSequencia[],
  palpiteMap: Map<string, PalpiteInternoSequencia>,
): JogoEsquecido[] {
  return jogos
    .filter((jogo) => !palpiteMap.has(jogo.id))
    .map((jogo) => ({
      jogoId: jogo.id,
      timeCasa: timeInfoSequencia(jogo.timeCasa, jogo.timeCasaId),
      timeFora: timeInfoSequencia(jogo.timeFora, jogo.timeForaId),
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
    }));
}

export function montarCargaSequencia(
  finalizados: JogoInternoSequencia[],
  palpiteMap: Map<string, PalpiteInternoSequencia>,
  pontuacaoService: PontuacaoService,
): {
  jogos: JogoParaSequencia[];
  pontosDe: (jogoId: string) => number | null;
} | null {
  if (finalizados.length < 2) return null;
  const pontos = new Map<string, number | null>();
  const paraSequencia = finalizados.map((jogo) => {
    pontos.set(
      jogo.id,
      pontosBaseDoJogo(jogo, palpiteMap.get(jogo.id), pontuacaoService),
    );
    return {
      id: jogo.id,
      rodada: jogo.rodada,
      dataHora: jogo.dataHora,
      golsCasa: jogo.golsCasa,
      golsFora: jogo.golsFora,
      timeCasaNome: jogo.timeCasa?.nome ?? jogo.timeCasaId,
      timeForaNome: jogo.timeFora?.nome ?? jogo.timeForaId,
    };
  });
  return {
    jogos: ordenarJogosDaSequencia(paraSequencia),
    pontosDe: (jogoId: string) => pontos.get(jogoId) ?? null,
  };
}

function pontosBaseDoJogo(
  jogo: JogoInternoSequencia,
  palpite: PalpiteInternoSequencia | undefined,
  pontuacaoService: PontuacaoService,
): number | null {
  if (!palpite || jogo.golsCasa === null || jogo.golsFora === null) return null;
  const resultado = pontuacaoService.calcular(
    { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora },
    { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
  );
  const pontuou =
    resultado.categoriaAcerto === 'ACERTO_EM_CHEIO' ||
    resultado.categoriaAcerto === 'ACERTO_DE_RESULTADO';
  return pontuou ? resultado.pontosBase : 0;
}

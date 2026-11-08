import { DESTAQUES } from '../destaques.constants';
import type { JogoSequencia } from '../types/destaque.types';

export interface JogoParaSequencia {
  id: string;
  rodada: number | null;
  dataHora: Date | string | null;
  golsCasa: number | null;
  golsFora: number | null;
  timeCasaNome: string;
  timeForaNome: string;
}

export interface SequenciaCalculada {
  quantidade: number;
  pontos: number;
  rodadaInicio: number | null;
  rodadaFim: number | null;
  ultimosJogos: JogoSequencia[];
}

interface SlotSequencia {
  jogos: JogoParaSequencia[];
  pontos: number[];
  pontuou: boolean;
}

function instante(jogo: JogoParaSequencia): number {
  if (!jogo.dataHora) return 0;
  const tempo = new Date(jogo.dataHora).getTime();
  return Number.isNaN(tempo) ? 0 : tempo;
}

export function ordenarJogosDaSequencia(
  jogos: JogoParaSequencia[],
): JogoParaSequencia[] {
  return [...jogos].sort(
    (a, b) => instante(a) - instante(b) || a.id.localeCompare(b.id),
  );
}

/**
 * A API só informa o horário de início. Jogos com o mesmo apito não têm
 * ordem de encerramento: se algum deles não pontuou, o horário inteiro
 * interrompe a sequência.
 */
export function calcularSequenciaAte(
  jogosOrdenados: JogoParaSequencia[],
  indiceAtual: number,
  pontosDe: (jogoId: string) => number | null,
): SequenciaCalculada {
  const atual = jogosOrdenados[indiceAtual];
  const vazio = sequenciaVazia(atual);
  if (!atual) return vazio;

  const pontosAtual = pontosDe(atual.id);
  if (pontosAtual == null || pontosAtual <= 0) return vazio;

  const slots = agruparSlots(jogosOrdenados, pontosDe);
  const indiceSlot = slots.findIndex((slot) =>
    slot.jogos.some((jogo) => jogo.id === atual.id),
  );
  const slot = slots[indiceSlot];
  if (!slot?.pontuou) return montar([atual], [pontosAtual]);

  const faixa: SlotSequencia[] = [];
  for (let i = indiceSlot; i >= 0; i--) {
    if (!slots[i].pontuou) break;
    faixa.unshift(slots[i]);
  }
  return montarDaFaixa(faixa);
}

/**
 * A rodada anterior só entra se o último palpite dela pontuou. A contagem
 * começa depois do último zero dessa rodada e segue até quebrar na atual.
 * Se a rodada atual, sozinha, tiver uma sequência com mais pontos, ela
 * é a escolhida.
 */
export function calcularMelhorSequenciaDaRodada(
  jogos: JogoParaSequencia[],
  rodadaAtual: number,
  pontosDe: (jogoId: string) => number | null,
): SequenciaCalculada | null {
  const slots = agruparSlots(ordenarJogosDaSequencia(jogos), pontosDe);
  const daAtual = slots.filter((slot) => slot.jogos[0]?.rodada === rodadaAtual);
  const soRodada = melhorFaixa(daAtual);
  const cruzada = sequenciaCruzandoRodadaAnterior(slots, rodadaAtual);

  if (cruzada && (!soRodada || cruzada.pontos >= soRodada.pontos)) {
    return cruzada;
  }
  return soRodada;
}

function sequenciaCruzandoRodadaAnterior(
  slots: SlotSequencia[],
  rodadaAtual: number,
): SequenciaCalculada | null {
  const anterior = slots.filter(
    (slot) => slot.jogos[0]?.rodada === rodadaAtual - 1,
  );
  const ultimoZero = ultimoIndiceSemPontuar(anterior);
  const cauda = anterior.slice(ultimoZero + 1);
  if (cauda.length === 0) return null;

  const continuacao = prefixoPontuado(
    slots.filter((slot) => slot.jogos[0]?.rodada === rodadaAtual),
  );
  if (continuacao.length === 0) return null;
  return faixaValida([...cauda, ...continuacao]);
}

function agruparSlots(
  jogosOrdenados: JogoParaSequencia[],
  pontosDe: (jogoId: string) => number | null,
): SlotSequencia[] {
  const slots: SlotSequencia[] = [];
  for (const jogo of jogosOrdenados) {
    const marca = instante(jogo);
    const ultimo = slots[slots.length - 1];
    const mesmoHorario = ultimo && instante(ultimo.jogos[0]) === marca;
    if (!mesmoHorario) slots.push({ jogos: [], pontos: [], pontuou: true });

    const slot = slots[slots.length - 1];
    const pontos = pontosDe(jogo.id);
    slot.jogos.push(jogo);
    slot.pontos.push(pontos ?? 0);
    if (pontos == null || pontos <= 0) slot.pontuou = false;
  }
  return slots;
}

function melhorFaixa(slots: SlotSequencia[]): SequenciaCalculada | null {
  let melhor: SequenciaCalculada | null = null;
  let faixa: SlotSequencia[] = [];

  const fechar = () => {
    const sequencia = faixaValida(faixa);
    if (sequencia && supera(sequencia, melhor)) melhor = sequencia;
    faixa = [];
  };

  for (const slot of slots) {
    if (!slot.pontuou) {
      fechar();
      continue;
    }
    faixa.push(slot);
  }
  fechar();
  return melhor;
}

function prefixoPontuado(slots: SlotSequencia[]): SlotSequencia[] {
  const prefixo: SlotSequencia[] = [];
  for (const slot of slots) {
    if (!slot.pontuou) break;
    prefixo.push(slot);
  }
  return prefixo;
}

function ultimoIndiceSemPontuar(slots: SlotSequencia[]): number {
  let indice = -1;
  slots.forEach((slot, i) => {
    if (!slot.pontuou) indice = i;
  });
  return indice;
}

function faixaValida(faixa: SlotSequencia[]): SequenciaCalculada | null {
  const jogos = faixa.flatMap((slot) => slot.jogos);
  if (jogos.length < DESTAQUES.LIMITES.SEQUENCIA_JOGOS_MINIMOS) return null;
  return montarDaFaixa(faixa);
}

function supera(
  candidata: SequenciaCalculada,
  atual: SequenciaCalculada | null,
): boolean {
  if (!atual) return true;
  if (candidata.pontos !== atual.pontos) return candidata.pontos > atual.pontos;
  return candidata.quantidade >= atual.quantidade;
}

function montarDaFaixa(faixa: SlotSequencia[]): SequenciaCalculada {
  return montar(
    faixa.flatMap((slot) => slot.jogos),
    faixa.flatMap((slot) => slot.pontos),
  );
}

function montar(
  jogos: JogoParaSequencia[],
  pontos: number[],
): SequenciaCalculada {
  const primeiro = jogos[0];
  const ultimo = jogos[jogos.length - 1];
  return {
    quantidade: jogos.length,
    pontos: pontos.reduce((soma, valor) => soma + valor, 0),
    rodadaInicio: primeiro?.rodada ?? null,
    rodadaFim: ultimo?.rodada ?? null,
    ultimosJogos: jogos.map((jogo) => ({
      timeCasa: jogo.timeCasaNome,
      timeFora: jogo.timeForaNome,
      golsCasa: jogo.golsCasa ?? 0,
      golsFora: jogo.golsFora ?? 0,
      rodada: jogo.rodada,
      acertou: true,
    })),
  };
}

function sequenciaVazia(
  atual: JogoParaSequencia | undefined,
): SequenciaCalculada {
  return {
    quantidade: 0,
    pontos: 0,
    rodadaInicio: atual?.rodada ?? null,
    rodadaFim: atual?.rodada ?? null,
    ultimosJogos: [],
  };
}
